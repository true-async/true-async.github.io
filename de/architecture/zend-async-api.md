---
layout: architecture
lang: de
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /de/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "Architektur des asynchronen ABI des PHP-Kerns -- Funktionszeiger, Erweiterungs-Registrierung, globaler Zustand und ZEND_ASYNC_*-Makros."
---

# TrueAsync ABI

Das `TrueAsync` `ABI` basiert auf einer klaren Trennung von **Definition** und **Implementierung**:

| Schicht         | Speicherort               | Verantwortung                                    |
|-----------------|---------------------------|--------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h`   | Definition von Typen, Strukturen, Funktionszeigern |
| **Erweiterung** | `ext/async/`              | Implementierung aller Funktionen, Registrierung über API |

Der `PHP`-Kern ruft Erweiterungsfunktionen nicht direkt auf.
Stattdessen verwendet er `ZEND_ASYNC_*`-Makros, die `Funktionszeiger` aufrufen,
die von der Erweiterung beim Laden registriert wurden.

Dieser Ansatz verfolgt zwei Ziele:
1. Die Async-Engine kann mit beliebig vielen Erweiterungen arbeiten, die das `ABI` implementieren
2. Makros reduzieren die Abhängigkeit von Implementierungsdetails und minimieren Refactoring

## Globaler Zustand

Der Teil des globalen Zustands, der mit Asynchronität zusammenhängt, befindet sich im PHP-Kern
und ist ebenfalls über das Makro `ZEND_ASYNC_G(v)` sowie andere spezialisierte Makros zugänglich,
wie z.B. `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Scheduler-Heartbeat-Flag
    bool in_scheduler_context;          // TRUE wenn aktuell im Scheduler
    bool graceful_shutdown;             // TRUE während des Herunterfahrens
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Aktuelle Coroutine
    zend_async_scope_t *main_scope;     // Wurzel-Scope
    zend_coroutine_t *scheduler;        // Scheduler-Coroutine
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Start

Derzeit startet `TrueAsync` nicht sofort, sondern tut dies verzögert zum "richtigen" Zeitpunkt.
(Dieser Ansatz wird sich in Zukunft ändern, da praktisch jede PHP-I/O-Funktion den `Scheduler` aktiviert.)

Wenn ein `PHP`-Skript mit der Ausführung beginnt, befindet sich `TrueAsync` im Zustand `ZEND_ASYNC_READY`.
Beim ersten Aufruf einer Funktion, die den `Scheduler` über das Makro `ZEND_ASYNC_SCHEDULER_LAUNCH()` benötigt,
wird der Scheduler initialisiert und wechselt in den Zustand `ZEND_ASYNC_ACTIVE`.

An diesem Punkt landet der Code, der ausgeführt wurde, in der Haupt-Coroutine,
und eine separate Coroutine wird für den `Scheduler` erstellt.

Neben `ZEND_ASYNC_SCHEDULER_LAUNCH()`, das den `Scheduler` explizit aktiviert,
fängt `TrueAsync` auch die Kontrolle in den Funktionen `php_execute_script_ex` und `php_request_shutdown` ab.

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

Dieser Code ermöglicht es, die Kontrolle nach Beendigung des Hauptthreads an den `Scheduler` zu übergeben.
Der `Scheduler` kann seinerseits andere Coroutinen starten, falls welche existieren.

Dieser Ansatz gewährleistet nicht nur 100% Transparenz von TrueAsync für den PHP-Programmierer,
sondern auch volle `PHP SAPI`-Kompatibilität. Clients, die `PHP SAPI` verwenden, behandeln `PHP` weiterhin als synchron,
obwohl intern ein `EventLoop` läuft.

In der Funktion `php_request_shutdown` erfolgt die letzte Abfangung, um Coroutinen in Destruktoren auszuführen,
wonach der `Scheduler` herunterfährt und Ressourcen freigibt.

## Erweiterungs-Registrierung

Da das `TrueAsync ABI` Teil des `PHP`-Kerns ist, steht es allen `PHP`-Erweiterungen frühestmöglich zur Verfügung.
Daher haben Erweiterungen die Möglichkeit, `TrueAsync` ordnungsgemäß zu initialisieren, bevor die `PHP Engine`
zur Codeausführung gestartet wird.

Eine Erweiterung registriert ihre Implementierungen über eine Reihe von `_register()`-Funktionen.
Jede Funktion akzeptiert eine Reihe von Funktionszeigern und schreibt sie
in die globalen `extern`-Variablen des Kerns.

Abhängig von den Zielen der Erweiterung erlaubt `allow_override` das legale Neu-Registrieren von Funktionszeigern.
Standardmäßig verbietet `TrueAsync` zwei Erweiterungen, dieselben `API`-Gruppen zu definieren.

`TrueAsync` ist in mehrere Kategorien unterteilt, jede mit ihrer eigenen Registrierungsfunktion:
* `Scheduler` -- API für die Kernfunktionalität. Enthält die Mehrheit der verschiedenen Funktionen
* `Reactor` -- API für die Arbeit mit dem `Event loop` und Events. Enthält Funktionen zum Erstellen verschiedener Event-Typen und zur Verwaltung des Reactor-Lebenszyklus
* `ThreadPool` -- API zur Verwaltung des Thread-Pools und der Aufgabenwarteschlange
* `Async IO` -- API für asynchrone I/O, einschließlich Dateideskriptoren, Sockets und UDP
* `Pool` -- API zur Verwaltung universeller Ressourcenpools mit Healthcheck- und Circuit-Breaker-Unterstützung

```c
zend_async_scheduler_register(
    char *module,                    // Modulname
    bool allow_override,             // Überschreiben erlauben
    zend_async_scheduler_launch_t,   // Scheduler starten
    zend_async_new_coroutine_t,      // Coroutine erstellen
    zend_async_new_scope_t,          // Scope erstellen
    zend_async_new_context_t,        // Kontext erstellen
    zend_async_spawn_t,              // Coroutine spawnen
    zend_async_suspend_t,            // Suspendieren
    zend_async_enqueue_coroutine_t,  // Einreihen
    zend_async_resume_t,             // Fortsetzen
    zend_async_cancel_t,             // Abbrechen
    // ... und andere
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Event-Loop initialisieren
    zend_async_reactor_shutdown_t,   // Event-Loop herunterfahren
    zend_async_reactor_execute_t,    // Ein Reactor-Tick
    zend_async_reactor_loop_alive_t, // Gibt es aktive Events
    zend_async_new_socket_event_t,   // Poll-Event erstellen
    zend_async_new_timer_event_t,    // Timer erstellen
    zend_async_new_signal_event_t,   // Signal abonnieren
    // ... und andere
);
```
