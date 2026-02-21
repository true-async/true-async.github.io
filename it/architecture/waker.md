---
layout: architecture
lang: it
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /it/architecture/waker.html
page_title: "Waker -- Meccanismo di Attesa e Risveglio"
description: "Progettazione interna del Waker -- il collegamento tra coroutine ed eventi: stati, resume_when, timeout, consegna degli errori."
---

# Meccanismo di Attesa e Risveglio delle Coroutine

Per memorizzare il contesto di attesa di una coroutine,
`TrueAsync` utilizza la struttura `Waker`.
Essa funge da collegamento tra una coroutine e gli eventi a cui e' sottoscritta.
Grazie al `Waker`, una coroutine sa sempre esattamente quali eventi sta attendendo.

## Struttura del Waker

Per ottimizzazione della memoria, il `waker` e' integrato direttamente nella struttura della coroutine (`zend_coroutine_t`),
il che evita allocazioni aggiuntive e semplifica la gestione della memoria,
sebbene nel codice venga utilizzato un puntatore `zend_async_waker_t *waker` per compatibilita' con le versioni precedenti.

Il `Waker` mantiene una lista degli eventi attesi e aggrega il risultato dell'attesa o l'eccezione.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Eventi che la coroutine sta attendendo
    HashTable events;

    // Eventi che si sono attivati nell'ultima iterazione
    HashTable *triggered_events;

    // Risultato del risveglio
    zval result;

    // Errore (se il risveglio e' stato causato da un errore)
    zend_object *error;

    // Punto di creazione (per il debug)
    zend_string *filename;
    uint32_t lineno;

    // Distruttore
    zend_async_waker_dtor dtor;
};
```

## Stati del Waker

In ogni fase della vita di una coroutine, il `Waker` si trova in uno dei cinque stati:

![Stati del Waker](/diagrams/it/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Il Waker non e' attivo
    ZEND_ASYNC_WAKER_WAITING,   // La coroutine e' in attesa di eventi
    ZEND_ASYNC_WAKER_QUEUED,    // La coroutine e' in coda per l'esecuzione
    ZEND_ASYNC_WAKER_IGNORED,   // La coroutine e' stata saltata
    ZEND_ASYNC_WAKER_RESULT     // Il risultato e' disponibile
} ZEND_ASYNC_WAKER_STATUS;
```

Una coroutine inizia con `NO_STATUS` -- il `Waker` esiste ma non e' attivo; la coroutine e' in esecuzione.
Quando la coroutine chiama `SUSPEND()`, il `Waker` passa allo stato `WAITING` e inizia a monitorare gli eventi.

Quando uno degli eventi si attiva, il `Waker` passa a `QUEUED`: il risultato viene salvato,
e la coroutine viene inserita nella coda dello `Scheduler` in attesa di un cambio di contesto.

Lo stato `IGNORED` e' necessario per i casi in cui una coroutine e' gia' nella coda ma deve essere distrutta.
In tal caso, lo `Scheduler` non avvia la coroutine ma finalizza immediatamente il suo stato.

Quando la coroutine si risveglia, il `Waker` passa allo stato `RESULT`.
A questo punto, `waker->error` viene trasferito in `EG(exception)`.
Se non ci sono errori, la coroutine puo' utilizzare `waker->result`. Ad esempio, `result` e' cio' che
la funzione `await()` restituisce.

## Creazione di un Waker

```c
// Ottieni il waker (crealo se non esiste)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Reinizializza il waker per una nuova attesa
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// Con timeout e cancellazione
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` distrugge il waker esistente
e lo reimposta allo stato iniziale. Questo permette di riutilizzare
il waker senza allocazioni.

## Sottoscrizione agli Eventi

Il modulo zend_async_API.c fornisce diverse funzioni pronte per associare una coroutine a un evento:

```c
zend_async_resume_when(
    coroutine,        // Quale coroutine risvegliare
    event,            // A quale evento sottoscriversi
    trans_event,      // Trasferire la proprieta' dell'evento
    callback,         // Funzione callback
    event_callback    // Callback della coroutine (o NULL)
);
```

`resume_when` e' la funzione di sottoscrizione principale.
Crea un `zend_coroutine_event_callback_t`, lo associa
all'evento e al waker della coroutine.

Come funzione callback, e' possibile utilizzare una delle tre standard,
a seconda di come si desidera risvegliare la coroutine:

```c
// Risultato positivo
zend_async_waker_callback_resolve(event, callback, result, exception);

// Cancellazione
zend_async_waker_callback_cancel(event, callback, result, exception);

// Timeout
zend_async_waker_callback_timeout(event, callback, result, exception);
```
