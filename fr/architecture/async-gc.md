---
layout: architecture
lang: fr
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /fr/architecture/async-gc.html
page_title: "Ramasse-miettes en contexte asynchrone"
description: "Comment le GC de PHP fonctionne avec les coroutines, les portees et les contextes -- gestionnaires get_gc, coroutines zombies, references circulaires."
---

# Ramasse-miettes en contexte asynchrone

En `PHP`, le ramasse-miettes fonctionne normalement de maniere synchrone. Lorsque le tampon de racines possibles est plein,
`gc_collect_cycles()` est appele dans le contexte courant. Le `GC` calcule les references circulaires
et appelle les destructeurs d'objets dans une boucle pour les objets marques pour suppression.

Dans un environnement concurrent, ce modele ne fonctionne plus. Le destructeur d'un objet peut appeler `await` --
par exemple, pour fermer correctement une connexion a la base de donnees. Si le `GC` s'execute dans une coroutine,
`await` suspendra cette coroutine, laissant le `GC` dans un etat incomplet.
Les autres coroutines verront des objets partiellement collectes.

C'est pourquoi `TrueAsync` a du modifier la logique du ramasse-miettes.

## Coroutine GC

Lorsque le tampon `gc_possible_root` se remplit et que le seuil est atteint, `zend_gc_collect_cycles()`
se lance dans une coroutine separee.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // Le GC est deja en cours dans une autre coroutine
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... collecte effective des dechets
}
```

La coroutine qui a declenche le `GC` n'est pas bloquee et continue son travail,
tandis que la collecte des dechets s'effectue au prochain tick du `Scheduler`.

La coroutine `GC` obtient son propre `Scope` de niveau superieur (`parent = NULL`).
Cela isole la collecte des dechets du code utilisateur : l'annulation d'un `Scope` utilisateur
n'affectera pas le `GC`.

## Destructeurs dans les coroutines

Le principal probleme survient specifiquement lors de l'appel des destructeurs, car les destructeurs peuvent
suspendre une coroutine de maniere inattendue. C'est pourquoi le `GC` utilise un algorithme d'iterateur concurrent base sur les microtaches.
Pour lancer l'iteration, le `GC` cree une autre coroutine d'iteration.
Ceci est fait pour creer l'illusion d'une execution sequentielle, ce qui simplifie considerablement le `GC`.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // Creer une coroutine enfant pour les destructeurs
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // La coroutine GC se suspend sur dtor_scope
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // Le GC dort pendant que les destructeurs s'executent

    return true;
}
```

Le destructeur utilise le mecanisme de Scope non seulement pour controler la duree de vie des coroutines, mais aussi pour
attendre leur achevement. A cette fin, un autre `Scope` enfant est cree
pour encapsuler toutes les coroutines de destructeurs :

```
gc_scope                          <- `GC` de niveau superieur
  \-- Coroutine GC                <- marquage + coordination
       \-- dtor_scope             <- portee enfant
            \-- dtor-coroutine[0] <- appel des destructeurs (HI_PRIORITY)
```


La coroutine `GC` s'abonne a l'evenement d'achevement de `dtor_scope`. Elle ne se reveillera que lorsque
**tous** les destructeurs dans `dtor_scope` seront termines.


![Ramasse-miettes dans une coroutine separee](/diagrams/fr/architecture-async-gc/gc-coroutine.svg)

## Que se passe-t-il si un destructeur appelle await ?

Ici, l'algorithme classique d'iterateur concurrent base sur les microtaches est utilise :
* Une microtache est enregistree qui s'executera si un changement de contexte se produit
* Si un changement se produit, la microtache cree une autre coroutine pour l'iteration

L'iterateur verifie s'il est toujours dans la meme coroutine :

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // appel du destructeur

        // Si la coroutine a change -- le destructeur a appele await
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // abandonner le parcours
        }
        idx++;
    }
    return SUCCESS;
}
```

Si `ZEND_ASYNC_CURRENT_COROUTINE` a change, cela signifie que le destructeur a appele `await`
et que la coroutine courante s'est endormie. Dans ce cas, l'iterateur se termine simplement, et la prochaine etape d'iteration
sera lancee dans une nouvelle coroutine.
