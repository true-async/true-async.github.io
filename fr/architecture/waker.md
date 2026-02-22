---
layout: architecture
lang: fr
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /fr/architecture/waker.html
page_title: "Waker -- Mecanisme d'attente et de reveil"
description: "Conception interne du Waker -- le lien entre les coroutines et les evenements : statuts, resume_when, timeout, transmission des erreurs."
---

# Mecanisme d'attente et de reveil des coroutines

Pour stocker le contexte d'attente d'une coroutine,
`TrueAsync` utilise la structure `Waker`.
Elle sert de lien entre une coroutine et les evenements auxquels elle est abonnee.
Grace au `Waker`, une coroutine sait toujours exactement quels evenements elle attend.

## Structure du Waker

Pour des raisons d'optimisation memoire, le `waker` est integre directement dans la structure de la coroutine (`zend_coroutine_t`),
ce qui evite des allocations supplementaires et simplifie la gestion memoire,
bien qu'un pointeur `zend_async_waker_t *waker` soit utilise dans le code pour la compatibilite ascendante.

Le `Waker` contient une liste des evenements attendus et agregue le resultat de l'attente ou l'exception.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Evenements que la coroutine attend
    HashTable events;

    // Evenements declenches lors de la derniere iteration
    HashTable *triggered_events;

    // Resultat du reveil
    zval result;

    // Erreur (si le reveil a ete cause par une erreur)
    zend_object *error;

    // Point de creation (pour le debogage)
    zend_string *filename;
    uint32_t lineno;

    // Destructeur
    zend_async_waker_dtor dtor;
};
```

## Statuts du Waker

A chaque etape de la vie d'une coroutine, le `Waker` se trouve dans l'un des cinq etats :

![Statuts du Waker](/diagrams/fr/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Le Waker n'est pas actif
    ZEND_ASYNC_WAKER_WAITING,   // La coroutine attend des evenements
    ZEND_ASYNC_WAKER_QUEUED,    // La coroutine est en file d'attente pour l'execution
    ZEND_ASYNC_WAKER_IGNORED,   // La coroutine a ete ignoree
    ZEND_ASYNC_WAKER_RESULT     // Le resultat est disponible
} ZEND_ASYNC_WAKER_STATUS;
```

Une coroutine demarre avec `NO_STATUS` -- le `Waker` existe mais n'est pas actif ; la coroutine s'execute.
Lorsque la coroutine appelle `SUSPEND()`, le `Waker` passe a `WAITING` et commence a surveiller les evenements.

Lorsqu'un des evenements se declenche, le `Waker` passe a `QUEUED` : le resultat est sauvegarde,
et la coroutine est placee dans la file du `Scheduler` en attente d'un changement de contexte.

Le statut `IGNORED` est necessaire pour les cas ou une coroutine est deja dans la file mais doit etre detruite.
Dans ce cas, le `Scheduler` ne lance pas la coroutine mais finalise immediatement son etat.

Lorsque la coroutine se reveille, le `Waker` passe a l'etat `RESULT`.
A ce moment, `waker->error` est transfere a `EG(exception)`.
S'il n'y a pas d'erreurs, la coroutine peut utiliser `waker->result`. Par exemple, `result` est ce que
la fonction `await()` retourne.

## Creation d'un Waker

```c
// Obtenir le waker (le creer s'il n'existe pas)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Reinitialiser le waker pour une nouvelle attente
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// Avec timeout et annulation
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` detruit le waker existant
et le reinitialise a son etat initial. Cela permet de reutiliser
le waker sans allocations.

## Abonnement aux evenements

Le module zend_async_API.c fournit plusieurs fonctions pretes a l'emploi pour lier une coroutine a un evenement :

```c
zend_async_resume_when(
    coroutine,        // Quelle coroutine reveiller
    event,            // A quel evenement s'abonner
    trans_event,      // Transferer la propriete de l'evenement
    callback,         // Fonction de callback
    event_callback    // Callback de coroutine (ou NULL)
);
```

`resume_when` est la fonction d'abonnement principale.
Elle cree un `zend_coroutine_event_callback_t`, le lie
a l'evenement et au waker de la coroutine.

Comme fonction de callback, vous pouvez utiliser l'une des trois fonctions standard,
selon la maniere dont vous souhaitez reveiller la coroutine :

```c
// Resultat reussi
zend_async_waker_callback_resolve(event, callback, result, exception);

// Annulation
zend_async_waker_callback_cancel(event, callback, result, exception);

// Timeout
zend_async_waker_callback_timeout(event, callback, result, exception);
```
