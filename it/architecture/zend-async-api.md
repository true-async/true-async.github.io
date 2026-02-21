---
layout: architecture
lang: it
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /it/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "Architettura dell'ABI asincrono del core PHP -- puntatori a funzione, registrazione delle estensioni, stato globale e macro ZEND_ASYNC_*."
---

# TrueAsync ABI

L'`ABI` di `TrueAsync` si basa su una netta separazione tra **definizione** e **implementazione**:

| Livello         | Posizione                 | Responsabilità                                     |
|-----------------|---------------------------|----------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h`   | Definizione di tipi, strutture, puntatori a funzione |
| **Estensione**  | `ext/async/`              | Implementazione di tutte le funzioni, registrazione tramite API |

Il core di `PHP` non chiama direttamente le funzioni dell'estensione.
Invece, utilizza le macro `ZEND_ASYNC_*` che invocano i `puntatori a funzione`
registrati dall'estensione al momento del caricamento.

Questo approccio persegue due obiettivi:
1. Il motore asincrono può funzionare con qualsiasi numero di estensioni che implementano l'`ABI`
2. Le macro riducono la dipendenza dai dettagli implementativi e minimizzano il refactoring

## Stato Globale

La porzione di stato globale relativa all'asincronicità risiede nel core PHP
ed è accessibile anche tramite la macro `ZEND_ASYNC_G(v)`, così come altre specializzate,
come `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Flag heartbeat dello Scheduler
    bool in_scheduler_context;          // TRUE se attualmente nello scheduler
    bool graceful_shutdown;             // TRUE durante lo spegnimento
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Coroutine corrente
    zend_async_scope_t *main_scope;     // Scope radice
    zend_coroutine_t *scheduler;        // Coroutine dello scheduler
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Avvio

Attualmente, `TrueAsync` non si avvia immediatamente ma lo fa in modo lazy al momento "giusto".
(Questo approccio cambierà in futuro, poiché praticamente qualsiasi funzione I/O di PHP attiva lo `Scheduler`.)

Quando uno script `PHP` inizia l'esecuzione, `TrueAsync` si trova nello stato `ZEND_ASYNC_READY`.
Alla prima chiamata di una funzione che richiede lo `Scheduler` tramite la macro `ZEND_ASYNC_SCHEDULER_LAUNCH()`,
lo scheduler viene inizializzato e passa allo stato `ZEND_ASYNC_ACTIVE`.

A questo punto, il codice che era in esecuzione finisce nella coroutine principale,
e viene creata una coroutine separata per lo `Scheduler`.

Oltre a `ZEND_ASYNC_SCHEDULER_LAUNCH()`, che attiva esplicitamente lo `Scheduler`,
`TrueAsync` intercetta anche il controllo nelle funzioni `php_execute_script_ex` e `php_request_shutdown`.

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

Questo codice permette di passare il controllo allo `Scheduler` dopo che il thread principale ha terminato l'esecuzione.
Lo `Scheduler` a sua volta può avviare altre coroutine se ne esistono.

Questo approccio garantisce non solo il 100% di trasparenza di TrueAsync per il programmatore PHP,
ma anche piena compatibilità con `PHP SAPI`. I client che utilizzano `PHP SAPI` continuano a trattare `PHP` come sincrono,
anche se internamente è in esecuzione un `EventLoop`.

Nella funzione `php_request_shutdown`, avviene l'ultima intercettazione per eseguire le coroutine nei distruttori,
dopodiché lo `Scheduler` si spegne e rilascia le risorse.

## Registrazione delle Estensioni

Poiché l'`ABI` di `TrueAsync` fa parte del core di `PHP`, è disponibile per tutte le estensioni `PHP` nella fase più precoce.
Pertanto, le estensioni hanno la possibilità di inizializzare correttamente `TrueAsync` prima che la `PHP Engine`
venga avviata per eseguire il codice.

Un'estensione registra le sue implementazioni attraverso un insieme di funzioni `_register()`.
Ogni funzione accetta un insieme di puntatori a funzione e li scrive
nelle variabili globali `extern` del core.

A seconda degli obiettivi dell'estensione, `allow_override` permette di ri-registrare legalmente i puntatori a funzione.
Per impostazione predefinita, `TrueAsync` proibisce a due estensioni di definire gli stessi gruppi `API`.

`TrueAsync` è diviso in diverse categorie, ciascuna con la propria funzione di registrazione:
* `Scheduler` -- API relativa alle funzionalità core. Contiene la maggior parte delle diverse funzioni
* `Reactor` -- API per lavorare con l'`Event loop` e gli eventi. Contiene funzioni per creare diversi tipi di eventi e gestire il ciclo di vita del reactor
* `ThreadPool` -- API per la gestione del pool di thread e della coda dei task
* `Async IO` -- API per I/O asincrono, inclusi descrittori di file, socket e UDP
* `Pool` -- API per la gestione di pool di risorse universali, con supporto per healthcheck e circuit breaker

```c
zend_async_scheduler_register(
    char *module,                    // Nome del modulo
    bool allow_override,             // Permettere sovrascrittura
    zend_async_scheduler_launch_t,   // Avviare lo scheduler
    zend_async_new_coroutine_t,      // Creare coroutine
    zend_async_new_scope_t,          // Creare scope
    zend_async_new_context_t,        // Creare contesto
    zend_async_spawn_t,              // Generare coroutine
    zend_async_suspend_t,            // Sospendere
    zend_async_enqueue_coroutine_t,  // Accodare
    zend_async_resume_t,             // Riprendere
    zend_async_cancel_t,             // Cancellare
    // ... e altri
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Inizializzare l'event loop
    zend_async_reactor_shutdown_t,   // Spegnere l'event loop
    zend_async_reactor_execute_t,    // Un tick del reactor
    zend_async_reactor_loop_alive_t, // Ci sono eventi attivi
    zend_async_new_socket_event_t,   // Creare evento poll
    zend_async_new_timer_event_t,    // Creare timer
    zend_async_new_signal_event_t,   // Sottoscrivere segnale
    // ... e altri
);
```
