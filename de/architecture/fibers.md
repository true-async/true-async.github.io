---
layout: architecture
lang: de
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /de/architecture/fibers.html
page_title: "Fibers in TrueAsync"
description: "Wie TrueAsync das Verhalten von Fiber verändert — Coroutine-Modus, GC, Refcount, Parameter, Exit/Bailout, Destruktoren."
---

# Fibers in TrueAsync

Im Standard-`PHP` ist ein Fiber (`Fiber`) ein kooperativer Thread mit eigenem Aufrufstack.
Wenn die Erweiterung `TrueAsync` geladen ist, wechselt der Fiber in den **Coroutine-Modus**:
Anstelle eines direkten Stack-Wechsels erhält der Fiber eine eigene Coroutine,
die vom Scheduler (`Scheduler`) verwaltet wird.

Dieser Artikel beschreibt die wesentlichen Änderungen im Verhalten von Fibers bei der Arbeit mit `TrueAsync`.

## Coroutine-Modus des Fibers

Beim Erstellen von `new Fiber(callable)` wird, sofern `TrueAsync` aktiv ist, anstelle der Initialisierung
eines Stack-Wechsel-Kontextes eine Coroutine erzeugt:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

Der Aufruf von `$fiber->start()` wechselt nicht direkt den Stack, sondern reiht die Coroutine
über `ZEND_ASYNC_ENQUEUE_COROUTINE` in die Warteschlange des Schedulers ein. Danach wird der
aufrufende Code in `zend_fiber_await()` pausiert, bis der Fiber beendet oder angehalten wird.

## Lebenszyklus des Coroutine-Refcounts

Der Fiber hält seine Coroutine explizit über `ZEND_ASYNC_EVENT_ADD_REF`:

```
Nach dem Konstruktor:  coroutine refcount = 1 (Scheduler)
Nach start():          coroutine refcount = 2 (Scheduler + Fiber)
```

Das zusätzliche `+1` vom Fiber ist notwendig, damit die Coroutine nach Beendigung
am Leben bleibt — andernfalls könnten `getReturn()`, `isTerminated()` und andere Methoden
nicht auf das Ergebnis zugreifen.

Die Freigabe des `+1` erfolgt im Destruktor des Fibers (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Parameter von Fiber::start() — Kopie auf den Heap

Das Makro `Z_PARAM_VARIADIC_WITH_NAMED` setzt beim Parsen der Argumente von `Fiber::start()`
`fcall->fci.params` als Zeiger direkt in den Stack des VM-Frames.
Im Standard-PHP ist das sicher — `zend_fiber_execute` wird sofort
über den Stack-Wechsel aufgerufen, und der Frame von `Fiber::start()` existiert noch.

Im Coroutine-Modus kann `fcall->fci.params` zu einem
dangling Pointer werden, wenn die erwartete Coroutine zuerst zerstört wird.
Es ist unmöglich zu garantieren, dass dies nie passiert.

Daher werden die Parameter nach dem Parsen in den Heap-Speicher kopiert:

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

Nun kann `coroutine_entry_point`
die Parameter sicher verwenden und freigeben.

## GC für Coroutine-Fibers

Anstatt das Coroutine-Objekt in den GC-Buffer aufzunehmen, durchläuft `zend_fiber_object_gc`
direkt den Ausführungsstack der Coroutine und übergibt die gefundenen Variablen:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Обход стека — как для обычного файбера
        for (; ex; ex = ex->prev_execute_data) {
            // ... добавляем CV в GC буфер ...
        }
    }
}
```

Dies funktioniert nur im Zustand `YIELD` (der Fiber ist über `Fiber::suspend()` pausiert).
In anderen Zuständen (running, awaiting child) ist der Stack aktiv und darf nicht durchlaufen werden.

## Destruktoren aus dem GC

Im Standard-PHP werden Destruktoren von Objekten, die der `GC` gefunden hat, synchron
im selben Kontext aufgerufen. In `TrueAsync` wird der GC in einer separaten GC-Coroutine
ausgeführt (siehe [Garbage Collection im asynchronen Kontext](async-gc.html)).

Das bedeutet:

1. **Ausführungsreihenfolge** — Destruktoren werden asynchron ausgeführt, nach der Rückkehr
   aus `gc_collect_cycles()`.

2. **`Fiber::suspend()` im Destruktor** — ist nicht möglich. Der Destruktor wird
   in der GC-Coroutine ausgeführt, nicht im Fiber. Ein Aufruf von `Fiber::suspend()` führt zum Fehler
   «Cannot suspend outside of a fiber».

3. **`Fiber::getCurrent()` im Destruktor** — gibt `NULL` zurück, da der Destruktor
   außerhalb des Fiber-Kontextes ausgeführt wird.

Aus diesem Grund sind Tests, die auf synchrone Ausführung von Destruktoren
aus dem GC innerhalb eines Fibers angewiesen sind, für `TrueAsync` als `skip` markiert.

## Generatoren beim Shutdown

Im Standard-PHP wird beim Zerstören eines Fibers der Generator mit dem Flag
`ZEND_GENERATOR_FORCED_CLOSE` markiert. Dadurch wird `yield from` in finally-Blöcken
verboten — der Generator stirbt und soll keine neuen Abhängigkeiten erzeugen.

In `TrueAsync` erhält die Coroutine ein graceful Cancellation anstelle eines erzwungenen
Schließens. Der Generator wird nicht als `FORCED_CLOSE` markiert, und `yield from`
in finally-Blöcken kann ausgeführt werden. Dies ist ein bekannter Verhaltensunterschied.

Es ist noch unklar, ob dieses Verhalten geändert werden sollte oder nicht.
