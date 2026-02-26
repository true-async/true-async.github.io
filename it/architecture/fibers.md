---
layout: architecture
lang: it
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /it/architecture/fibers.html
page_title: "I Fiber in TrueAsync"
description: "Come TrueAsync modifica il comportamento dei Fiber: modalità coroutine, GC, refcount, parametri, exit/bailout, distruttori."
---

# I Fiber in TrueAsync

Nel `PHP` standard, un fiber (`Fiber`) è un thread cooperativo con un proprio stack di chiamate.
Quando l'estensione `TrueAsync` è attiva, il fiber passa alla **modalità coroutine**:
invece di commutare direttamente gli stack, il fiber ottiene una propria coroutine,
gestita dallo scheduler (`Scheduler`).

Questo articolo descrive le principali modifiche nel comportamento dei fiber con `TrueAsync`.

## Modalità coroutine del fiber

Quando si crea `new Fiber(callable)`, se `TrueAsync` è attivo, invece di inizializzare
il contesto di commutazione degli stack viene creata una coroutine:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

La chiamata `$fiber->start()` non commuta direttamente lo stack, ma inserisce la coroutine
nella coda dello scheduler tramite `ZEND_ASYNC_ENQUEUE_COROUTINE`, dopodiché il codice
chiamante si sospende in `zend_fiber_await()` fino al completamento o alla sospensione del fiber.

## Ciclo di vita del refcount della coroutine

Il fiber mantiene esplicitamente la propria coroutine tramite `ZEND_ASYNC_EVENT_ADD_REF`:

```
Dopo il costruttore:  coroutine refcount = 1 (scheduler)
Dopo start():        coroutine refcount = 2 (scheduler + fiber)
```

Il `+1` aggiuntivo da parte del fiber è necessario affinché la coroutine rimanga viva
dopo il completamento, altrimenti `getReturn()`, `isTerminated()` e altri metodi
non potrebbero accedere al risultato.

Il rilascio del `+1` avviene nel distruttore del fiber (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Parametri di Fiber::start() — copia nell'heap

La macro `Z_PARAM_VARIADIC_WITH_NAMED` durante il parsing degli argomenti di `Fiber::start()`
imposta `fcall->fci.params` come puntatore diretto nello stack del frame della VM.
Nel PHP standard questo è sicuro — `zend_fiber_execute` viene chiamato immediatamente
tramite commutazione dello stack, e il frame di `Fiber::start()` è ancora vivo.

In modalità coroutine `fcall->fci.params` può diventare
un puntatore pendente se la coroutine attesa viene distrutta per prima.
Non è possibile garantire che ciò non accada mai.

Pertanto, dopo il parsing dei parametri, li copiamo nella memoria heap:

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

Ora `coroutine_entry_point`
può utilizzare e rilasciare i parametri in sicurezza.

## GC per i fiber in modalità coroutine

Invece di aggiungere l'oggetto coroutine al buffer del GC, `zend_fiber_object_gc`
attraversa direttamente lo stack di esecuzione della coroutine e passa le variabili trovate:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Attraversamento dello stack — come per un fiber normale
        for (; ex; ex = ex->prev_execute_data) {
            // ... aggiungiamo le CV al buffer del GC ...
        }
    }
}
```

Questo funziona solo per lo stato `YIELD` (fiber sospeso tramite `Fiber::suspend()`).
Per gli altri stati (running, awaiting child) lo stack è attivo e non può essere attraversato.

## Distruttori dal GC

Nel PHP standard i distruttori degli oggetti trovati dal `GC` vengono chiamati in modo sincrono
nello stesso contesto. In `TrueAsync` il GC viene eseguito in una coroutine GC dedicata
(vedi [Garbage collection nel contesto asincrono](async-gc.html)).

Questo significa:

1. **Ordine di esecuzione** — i distruttori vengono eseguiti in modo asincrono, dopo il ritorno
   da `gc_collect_cycles()`.

2. **`Fiber::suspend()` nel distruttore** — non è possibile. Il distruttore viene eseguito
   nella coroutine del GC, non nel fiber. La chiamata a `Fiber::suspend()` provocherà l'errore
   «Cannot suspend outside of a fiber».

3. **`Fiber::getCurrent()` nel distruttore** — restituirà `NULL`, poiché il distruttore
   viene eseguito al di fuori del contesto di un fiber.

Per questo motivo i test che prevedono l'esecuzione sincrona dei distruttori
dal GC all'interno di un fiber sono contrassegnati come `skip` per `TrueAsync`.

## Generatori durante lo shutdown

Nel PHP standard, quando un fiber viene distrutto, il generatore viene contrassegnato con il flag
`ZEND_GENERATOR_FORCED_CLOSE`. Questo impedisce `yield from` nei blocchi finally —
il generatore sta morendo e non deve creare nuove dipendenze.

In `TrueAsync` la coroutine riceve una cancellazione graceful, non una chiusura
forzata. Il generatore non viene contrassegnato come `FORCED_CLOSE`, e `yield from`
nei blocchi finally può essere eseguito. Questa è una differenza di comportamento nota.

Non è ancora chiaro se sia opportuno modificare questo aspetto oppure no.
