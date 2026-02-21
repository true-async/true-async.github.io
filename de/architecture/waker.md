---
layout: architecture
lang: de
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /de/architecture/waker.html
page_title: "Waker -- Warte- und Aufweckmechanismus"
description: "Internes Design des Wakers -- die Verbindung zwischen Coroutinen und Events: Status, resume_when, Timeout, Fehlerübermittlung."
---

# Coroutine-Warte- und Aufweckmechanismus

Um den Wartekontext einer Coroutine zu speichern,
verwendet `TrueAsync` die `Waker`-Struktur.
Sie dient als Verbindung zwischen einer Coroutine und den Events, die sie abonniert hat.
Dank des `Wakers` weiß eine Coroutine immer genau, auf welche Events sie wartet.

## Waker-Struktur

Aus Gründen der Speicheroptimierung ist der `Waker` direkt in die Coroutine-Struktur (`zend_coroutine_t`) integriert,
was zusätzliche Allokationen vermeidet und die Speicherverwaltung vereinfacht,
obwohl im Code aus Gründen der Abwärtskompatibilität ein `zend_async_waker_t *waker`-Zeiger verwendet wird.

Der `Waker` hält eine Liste der erwarteten Events und aggregiert das Warteergebnis oder die Exception.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Events, auf die die Coroutine wartet
    HashTable events;

    // Events, die bei der letzten Iteration ausgelöst wurden
    HashTable *triggered_events;

    // Aufweckergebnis
    zval result;

    // Fehler (wenn das Aufwecken durch einen Fehler verursacht wurde)
    zend_object *error;

    // Erstellungspunkt (zum Debuggen)
    zend_string *filename;
    uint32_t lineno;

    // Destruktor
    zend_async_waker_dtor dtor;
};
```

## Waker-Status

In jeder Phase des Lebens einer Coroutine befindet sich der `Waker` in einem von fünf Zuständen:

![Waker-Status](/diagrams/de/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker ist nicht aktiv
    ZEND_ASYNC_WAKER_WAITING,   // Coroutine wartet auf Events
    ZEND_ASYNC_WAKER_QUEUED,    // Coroutine ist zur Ausführung eingereiht
    ZEND_ASYNC_WAKER_IGNORED,   // Coroutine wurde übersprungen
    ZEND_ASYNC_WAKER_RESULT     // Ergebnis ist verfügbar
} ZEND_ASYNC_WAKER_STATUS;
```

Eine Coroutine beginnt mit `NO_STATUS` -- der `Waker` existiert, ist aber nicht aktiv; die Coroutine wird ausgeführt.
Wenn die Coroutine `SUSPEND()` aufruft, wechselt der `Waker` zu `WAITING` und beginnt Events zu überwachen.

Wenn eines der Events auslöst, wechselt der `Waker` zu `QUEUED`: Das Ergebnis wird gespeichert
und die Coroutine wird in die `Scheduler`-Warteschlange eingereiht, um auf einen Kontextwechsel zu warten.

Der `IGNORED`-Status wird für Fälle benötigt, wenn eine Coroutine bereits in der Warteschlange ist, aber zerstört werden muss.
In diesem Fall startet der `Scheduler` die Coroutine nicht, sondern finalisiert sofort ihren Zustand.

Wenn die Coroutine aufwacht, wechselt der `Waker` in den `RESULT`-Zustand.
An diesem Punkt wird `waker->error` nach `EG(exception)` übertragen.
Wenn keine Fehler vorliegen, kann die Coroutine `waker->result` verwenden. Zum Beispiel ist `result` das, was die
`await()`-Funktion zurückgibt.

## Erstellen eines Wakers

```c
// Waker abrufen (erstellen, falls nicht vorhanden)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Waker für ein neues Warten reinitialisieren
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// Mit Timeout und Abbruch
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` destruiert den vorhandenen Waker
und setzt ihn auf seinen Anfangszustand zurück. Dies ermöglicht die Wiederverwendung
des Wakers ohne Allokationen.

## Abonnieren von Events

Das Modul zend_async_API.c bietet mehrere fertige Funktionen, um eine Coroutine an ein Event zu binden:

```c
zend_async_resume_when(
    coroutine,        // Welche Coroutine aufwecken
    event,            // Welches Event abonnieren
    trans_event,      // Event-Eigentum übertragen
    callback,         // Callback-Funktion
    event_callback    // Coroutine-Callback (oder NULL)
);
```

`resume_when` ist die Haupt-Abonnementfunktion.
Sie erstellt einen `zend_coroutine_event_callback_t`, bindet ihn
an das Event und an den Waker der Coroutine.

Als Callback-Funktion kann eine der drei Standardfunktionen verwendet werden,
je nachdem, wie die Coroutine aufgeweckt werden soll:

```c
// Erfolgreiches Ergebnis
zend_async_waker_callback_resolve(event, callback, result, exception);

// Abbruch
zend_async_waker_callback_cancel(event, callback, result, exception);

// Timeout
zend_async_waker_callback_timeout(event, callback, result, exception);
```
