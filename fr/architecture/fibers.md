---
layout: architecture
lang: fr
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /fr/architecture/fibers.html
page_title: "Les Fibers dans TrueAsync"
description: "Comment TrueAsync modifie le comportement des Fiber — mode coroutine, GC, refcount, paramètres, exit/bailout, destructeurs."
---

# Les Fibers dans TrueAsync

Dans le `PHP` standard, un fiber (`Fiber`) est un thread coopératif possédant sa propre pile d'appels.
Lorsque l'extension `TrueAsync` est chargée, le fiber passe en **mode coroutine** :
au lieu d'un changement direct de pile, le fiber obtient sa propre coroutine,
gérée par l'ordonnanceur (`Scheduler`).

Cet article décrit les principaux changements de comportement des fibers avec `TrueAsync`.

## Mode coroutine du fiber

Lors de la création de `new Fiber(callable)`, si `TrueAsync` est actif, au lieu d'initialiser
un contexte de changement de pile, une coroutine est créée :

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

L'appel à `$fiber->start()` ne change pas directement la pile, mais place la coroutine
dans la file d'attente de l'ordonnanceur via `ZEND_ASYNC_ENQUEUE_COROUTINE`, après quoi le code appelant
se suspend dans `zend_fiber_await()` jusqu'à ce que le fiber se termine ou se suspende.

## Cycle de vie du refcount de la coroutine

Le fiber maintient explicitement sa coroutine via `ZEND_ASYNC_EVENT_ADD_REF` :

```
Après le constructeur :   coroutine refcount = 1 (ordonnanceur)
Après start() :           coroutine refcount = 2 (ordonnanceur + fiber)
```

Le `+1` supplémentaire du fiber est nécessaire pour que la coroutine reste vivante
après sa terminaison, sinon `getReturn()`, `isTerminated()` et les autres méthodes
ne pourraient pas accéder au résultat.

La libération du `+1` se fait dans le destructeur du fiber (`zend_fiber_object_destroy`) :

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Paramètres de Fiber::start() — copie vers le heap

La macro `Z_PARAM_VARIADIC_WITH_NAMED` lors de l'analyse des arguments de `Fiber::start()`
définit `fcall->fci.params` comme un pointeur directement dans la pile du frame VM.
En PHP standard, c'est sûr — `zend_fiber_execute` est appelé immédiatement
via un changement de pile, et le frame de `Fiber::start()` est encore actif.

En mode coroutine, `fcall->fci.params` peut devenir
un pointeur suspendu si la coroutine attendue est détruite en premier.
Il est impossible de garantir que cela n'arrivera jamais.

C'est pourquoi, après l'analyse des paramètres, nous les copions en mémoire heap :

```c
if (fiber->coroutine != NULL && fiber->fcall != NULL) {
    if (fiber->fcall->fci.param_count > 0) {
        uint32_t count = fiber->fcall->fci.param_count;
        zval *heap_params = emalloc(sizeof(zval) * count);
        for (uint32_t i = 0; i < count; i++) {
            ZVAL_COPY(&heap_params[i], &fiber->fcall->fci.params[i]);
        }
        fiber->fcall->fci.params = heap_params;
    }
    if (fiber->fcall->fci.named_params) {
        GC_ADDREF(fiber->fcall->fci.named_params);
    }
}
```

Désormais, `coroutine_entry_point`
peut utiliser et libérer les paramètres en toute sécurité.

## GC pour les fibers en mode coroutine

Au lieu d'ajouter l'objet coroutine au tampon GC, `zend_fiber_object_gc`
parcourt directement la pile d'exécution de la coroutine et transmet les variables trouvées :

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Parcours de la pile — comme pour un fiber standard
        for (; ex; ex = ex->prev_execute_data) {
            // ... ajout des CV au tampon GC ...
        }
    }
}
```

Cela ne fonctionne que pour l'état `YIELD` (fiber suspendu via `Fiber::suspend()`).
Pour les autres états (running, awaiting child), la pile est active et ne peut pas être parcourue.

## Destructeurs depuis le GC

En PHP standard, les destructeurs d'objets découverts par le `GC` sont appelés de manière synchrone
dans le même contexte. Dans `TrueAsync`, le GC s'exécute dans une coroutine GC dédiée
(voir [Ramasse-miettes en contexte asynchrone](async-gc.html)).

Cela signifie :

1. **Ordre d'exécution** — les destructeurs s'exécutent de manière asynchrone, après le retour
   de `gc_collect_cycles()`.

2. **`Fiber::suspend()` dans un destructeur** — impossible. Le destructeur s'exécute
   dans la coroutine GC, pas dans un fiber. L'appel à `Fiber::suspend()` provoquera l'erreur
   « Cannot suspend outside of a fiber ».

3. **`Fiber::getCurrent()` dans un destructeur** — retournera `NULL`, car le destructeur
   s'exécute en dehors du contexte d'un fiber.

Pour cette raison, les tests qui supposent une exécution synchrone des destructeurs
depuis le GC à l'intérieur d'un fiber sont marqués comme `skip` pour `TrueAsync`.

## Générateurs lors du shutdown

En PHP standard, lors de la destruction d'un fiber, le générateur est marqué avec le drapeau
`ZEND_GENERATOR_FORCED_CLOSE`. Cela interdit `yield from` dans les blocs finally —
le générateur meurt et ne doit pas créer de nouvelles dépendances.

Dans `TrueAsync`, la coroutine reçoit une annulation gracieuse (graceful cancellation) plutôt qu'une
fermeture forcée. Le générateur n'est pas marqué comme `FORCED_CLOSE`, et `yield from`
dans les blocs finally peut s'exécuter. C'est une différence de comportement connue.

Il n'est pas encore clair s'il faut modifier ce comportement ou non.
