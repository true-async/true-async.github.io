---
layout: architecture
lang: de
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /de/architecture/async-gc.html
page_title: "Garbage Collection im asynchronen Kontext"
description: "Wie PHP GC mit Koroutinen, Scope und Kontexten funktioniert -- get_gc-Handler, Zombie-Koroutinen, zirkulaere Referenzen."
---

# Garbage Collection im asynchronen Kontext

In `PHP` arbeitet der Garbage Collector normalerweise synchron. Wenn der Puffer fuer moegliche Roots voll ist,
wird `gc_collect_cycles()` im aktuellen Kontext aufgerufen. Der `GC` berechnet zirkulaere Referenzen
und ruft Objekt-Destruktoren in einer Schleife fuer Objekte auf, die zur Loeschung markiert sind.

In einer nebenlaeufigen Umgebung bricht dieses Modell zusammen. Der Destruktor eines Objekts kann `await` aufrufen --
zum Beispiel, um eine Datenbankverbindung ordnungsgemaess zu schliessen. Wenn der `GC` innerhalb einer Koroutine laeuft,
wird `await` diese Koroutine suspendieren und den `GC` in einem unvollstaendigen Zustand belassen.
Andere Koroutinen sehen dann teilweise gesammelte Objekte.

Aus diesem Grund musste `TrueAsync` die Garbage-Collection-Logik aendern.

## GC-Koroutine

Wenn der `gc_possible_root`-Puffer sich fuellt und der Schwellenwert ausgeloest wird, startet `zend_gc_collect_cycles()`
sich selbst in einer separaten Koroutine.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // GC laeuft bereits in einer anderen Koroutine
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... eigentliche Garbage Collection
}
```

Die Koroutine, die den `GC` ausgeloest hat, wird nicht blockiert und setzt ihre Arbeit fort,
waehrend die Garbage Collection beim naechsten `Scheduler`-Tick stattfindet.

Die `GC`-Koroutine erhaelt ihren eigenen Top-Level-`Scope` (`parent = NULL`).
Dies isoliert die Garbage Collection vom Benutzercode: Das Abbrechen eines Benutzer-`Scope`
beeinflusst den `GC` nicht.

## Destruktoren in Koroutinen

Das Hauptproblem tritt speziell beim Aufruf von Destruktoren auf, da Destruktoren unerwartet
eine Koroutine suspendieren koennen. Daher verwendet der `GC` einen nebenlaeufigen Iterator-Algorithmus basierend auf Microtasks.
Um die Iteration zu starten, erstellt der `GC` eine weitere Iterator-Koroutine.
Dies geschieht, um die Illusion einer sequentiellen Ausfuehrung zu erzeugen, was den `GC` erheblich vereinfacht.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // Kind-Koroutine fuer Destruktoren erstellen
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // GC-Koroutine suspendiert sich auf dtor_scope
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // GC schlaeft, waehrend Destruktoren laufen

    return true;
}
```

Der Destruktor nutzt den Scope-Mechanismus nicht nur zur Steuerung der Lebenszeit von Koroutinen, sondern auch zum
Warten auf deren Abschluss. Dafuer wird ein weiterer Kind-`Scope` erstellt,
um alle Destruktor-Koroutinen zu kapseln:

```
gc_scope                          <- Top-Level-`GC`
  \-- GC-Koroutine                <- Markierung + Koordination
       \-- dtor_scope             <- Kind-Scope
            \-- dtor-coroutine[0] <- Destruktoraufruf (HI_PRIORITY)
```


Die `GC`-Koroutine abonniert das Abschlussevent von `dtor_scope`. Sie wird erst aufgeweckt, wenn
**alle** Destruktoren in `dtor_scope` abgeschlossen sind.


![Garbage Collection in einer separaten Koroutine](/diagrams/de/architecture-async-gc/gc-coroutine.svg)

## Was passiert, wenn ein Destruktor await aufruft?

Hier kommt der klassische nebenlaeufige Iterator-Algorithmus basierend auf Microtasks zum Einsatz:
* Ein Microtask wird registriert, der ausgefuehrt wird, wenn ein Kontextwechsel stattfindet
* Falls ein Wechsel stattfindet, erstellt der Microtask eine weitere Koroutine fuer die Iteration

Der Iterator prueft, ob er sich noch in derselben Koroutine befindet:

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // Destruktor aufrufen

        // Wenn sich die Koroutine geaendert hat -- hat der Destruktor await aufgerufen
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // Traversierung abbrechen
        }
        idx++;
    }
    return SUCCESS;
}
```

Wenn sich `ZEND_ASYNC_CURRENT_COROUTINE` geaendert hat, bedeutet dies, dass der Destruktor `await` aufgerufen hat
und die aktuelle Koroutine eingeschlafen ist. In diesem Fall beendet der Iterator einfach seine Arbeit, und der naechste Iterationsschritt
wird in einer neuen Koroutine gestartet.
