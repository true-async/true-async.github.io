---
layout: architecture
lang: fr
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /fr/architecture/zend-async-api.html
page_title: "ABI TrueAsync"
description: "Architecture de l'ABI asynchrone du noyau PHP -- pointeurs de fonctions, enregistrement des extensions, etat global et macros ZEND_ASYNC_*."
---

# ABI TrueAsync

L'`ABI` de `TrueAsync` est construite sur une separation claire entre **definition** et **implementation** :

| Couche          | Emplacement               | Responsabilite                                      |
|-----------------|---------------------------|-----------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h`   | Definition des types, structures, pointeurs de fonctions |
| **Extension**   | `ext/async/`              | Implementation de toutes les fonctions, enregistrement via l'API |

Le noyau `PHP` n'appelle pas directement les fonctions de l'extension.
A la place, il utilise des macros `ZEND_ASYNC_*` qui invoquent des `pointeurs de fonctions`
enregistres par l'extension au chargement.

Cette approche sert deux objectifs :
1. Le moteur async peut fonctionner avec n'importe quel nombre d'extensions implementant l'`ABI`
2. Les macros reduisent la dependance aux details d'implementation et minimisent le refactoring

## Etat global

La partie de l'etat global liee a l'asynchronie reside dans le noyau PHP
et est egalement accessible via la macro `ZEND_ASYNC_G(v)`, ainsi que d'autres macros specialisees,
comme `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Drapeau de battement du Scheduler
    bool in_scheduler_context;          // TRUE si actuellement dans le scheduler
    bool graceful_shutdown;             // TRUE pendant l'arret
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Coroutine courante
    zend_async_scope_t *main_scope;     // Portee racine
    zend_coroutine_t *scheduler;        // Coroutine du scheduler
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Demarrage

Actuellement, `TrueAsync` ne demarre pas immediatement mais le fait paresseusement au "bon" moment.
(Cette approche changera a l'avenir, puisque pratiquement n'importe quelle fonction d'E/S PHP active le `Scheduler`.)

Lorsqu'un script `PHP` commence son execution, `TrueAsync` est dans l'etat `ZEND_ASYNC_READY`.
Au premier appel d'une fonction necessitant le `Scheduler` via la macro `ZEND_ASYNC_SCHEDULER_LAUNCH()`,
le scheduler est initialise et passe a l'etat `ZEND_ASYNC_ACTIVE`.

A ce moment, le code qui s'executait se retrouve dans la coroutine principale,
et une coroutine separee est creee pour le `Scheduler`.

En plus de `ZEND_ASYNC_SCHEDULER_LAUNCH()`, qui active explicitement le `Scheduler`,
`TrueAsync` intercepte egalement le controle dans les fonctions `php_execute_script_ex` et `php_request_shutdown`.

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

Ce code permet de passer le controle au `Scheduler` apres la fin du thread principal.
Le `Scheduler` peut a son tour lancer d'autres coroutines si elles existent.

Cette approche garantit non seulement une transparence a 100% de TrueAsync pour le programmeur PHP,
mais aussi une compatibilite complete avec `PHP SAPI`. Les clients utilisant `PHP SAPI` continuent de traiter `PHP` comme synchrone,
meme si un `EventLoop` tourne en interne.

Dans la fonction `php_request_shutdown`, l'interception finale se produit pour executer les coroutines dans les destructeurs,
apres quoi le `Scheduler` s'arrete et libere les ressources.

## Enregistrement des extensions

Puisque l'`ABI TrueAsync` fait partie du noyau `PHP`, elle est disponible pour toutes les extensions `PHP` au stade le plus precoce.
Par consequent, les extensions ont la possibilite d'initialiser correctement `TrueAsync` avant que le `moteur PHP`
ne soit lance pour executer du code.

Une extension enregistre ses implementations a travers un ensemble de fonctions `_register()`.
Chaque fonction accepte un ensemble de pointeurs de fonctions et les ecrit
dans les variables `extern` globales du noyau.

Selon les objectifs de l'extension, `allow_override` permet de re-enregistrer legalement des pointeurs de fonctions.
Par defaut, `TrueAsync` interdit a deux extensions de definir les memes groupes d'`API`.

`TrueAsync` est divise en plusieurs categories, chacune avec sa propre fonction d'enregistrement :
* `Scheduler` -- API liee aux fonctionnalites de base. Contient la majorite des differentes fonctions
* `Reactor` -- API pour travailler avec l'`Event loop` et les evenements. Contient des fonctions pour creer differents types d'evenements et gerer le cycle de vie du reacteur
* `ThreadPool` -- API pour la gestion du pool de threads et de la file de taches
* `Async IO` -- API pour les E/S asynchrones, incluant les descripteurs de fichiers, les sockets et l'UDP
* `Pool` -- API pour la gestion des pools de ressources universels, avec support du healthcheck et du circuit breaker

```c
zend_async_scheduler_register(
    char *module,                    // Nom du module
    bool allow_override,             // Autoriser l'ecrasement
    zend_async_scheduler_launch_t,   // Lancer le scheduler
    zend_async_new_coroutine_t,      // Creer une coroutine
    zend_async_new_scope_t,          // Creer une portee
    zend_async_new_context_t,        // Creer un contexte
    zend_async_spawn_t,              // Engendrer une coroutine
    zend_async_suspend_t,            // Suspendre
    zend_async_enqueue_coroutine_t,  // Mettre en file d'attente
    zend_async_resume_t,             // Reprendre
    zend_async_cancel_t,             // Annuler
    // ... et autres
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Initialiser la boucle d'evenements
    zend_async_reactor_shutdown_t,   // Arreter la boucle d'evenements
    zend_async_reactor_execute_t,    // Un tick du reacteur
    zend_async_reactor_loop_alive_t, // Y a-t-il des evenements actifs
    zend_async_new_socket_event_t,   // Creer un evenement poll
    zend_async_new_timer_event_t,    // Creer un timer
    zend_async_new_signal_event_t,   // S'abonner a un signal
    // ... et autres
);
```
