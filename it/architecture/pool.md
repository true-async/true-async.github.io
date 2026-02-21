---
layout: architecture
lang: it
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /it/architecture/pool.html
page_title: "Architettura Async\\Pool"
description: "Progettazione interna del pool di risorse universale Async\\Pool -- strutture dati, algoritmi acquire/release, healthcheck, circuit breaker."
---

# Architettura Async\Pool

> Questo articolo descrive la progettazione interna del pool di risorse universale.
> Se stai cercando una guida all'uso, vedi [Async\Pool](/it/docs/components/pool.html).
> Per il livello specifico PDO, vedi [Architettura PDO Pool](/it/architecture/pdo-pool.html).

## Struttura Dati

Il pool è implementato in due livelli: una struttura ABI pubblica nel core PHP
e una struttura interna estesa nell'estensione async.

![Strutture Dati del Pool](/diagrams/it/architecture-pool/data-structures.svg)

## Due Percorsi di Creazione

Un pool può essere creato dal codice PHP (tramite il costruttore `Async\Pool`)
o da un'estensione C (tramite l'API interna).

| Percorso | Funzione                            | Callback                       | Usato da               |
|----------|-------------------------------------|--------------------------------|------------------------|
| PHP      | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | Codice utente          |
| API C    | `zend_async_pool_create_internal()` | puntatori a funzione           | PDO, altre estensioni  |

La differenza sta in `handler_flags`. Quando il flag è impostato, il pool chiama la funzione C direttamente,
bypassando l'overhead della chiamata di un callable PHP attraverso `zend_call_function()`.

## Acquire: Ottenere una Risorsa

![acquire() -- Algoritmo Interno](/diagrams/it/architecture-pool/acquire.svg)

### Attesa di una Risorsa

Quando tutte le risorse sono occupate e `max_size` è raggiunto, la coroutine si sospende
tramite `ZEND_ASYNC_SUSPEND()`. Il meccanismo di attesa è simile ai canali:

1. Viene creata una struttura `zend_async_pool_waiter_t`
2. Il waiter viene aggiunto alla coda FIFO `waiters`
3. Viene registrato un callback per il risveglio
4. Se è impostato un timeout -- viene registrato un timer
5. `ZEND_ASYNC_SUSPEND()` -- la coroutine cede il controllo

Il risveglio avviene quando un'altra coroutine chiama `release()`.

## Release: Restituire una Risorsa

![release() -- Algoritmo Interno](/diagrams/it/architecture-pool/release.svg)

## Healthcheck: Monitoraggio in Background

Se `healthcheckInterval > 0`, viene avviato un timer periodico quando il pool viene creato.
Il timer è integrato con il reactor tramite `ZEND_ASYNC_NEW_TIMER_EVENT`.

![Healthcheck -- Controllo Periodico](/diagrams/it/architecture-pool/healthcheck.svg)

L'healthcheck verifica **solo** le risorse libere. Le risorse occupate non sono interessate.
Se, dopo la rimozione delle risorse morte, il conteggio totale scende sotto `min`, il pool crea sostituzioni.

## Buffer Circolare

Le risorse libere sono memorizzate in un buffer circolare -- un ring buffer con capacità fissa.
La capacità iniziale è di 8 elementi, espandibile secondo necessità.

Le operazioni `push` e `pop` vengono eseguite in O(1). Il buffer utilizza due puntatori (`head` e `tail`),
consentendo l'aggiunta e l'estrazione efficienti delle risorse senza spostare elementi.

## Integrazione con il Sistema di Eventi

Il pool eredita da `zend_async_event_t` e implementa un set completo di handler per gli eventi:

| Handler        | Scopo                                                      |
|----------------|------------------------------------------------------------|
| `add_callback` | Registra un callback (per i waiter)                        |
| `del_callback` | Rimuove un callback                                        |
| `start`        | Avvia l'evento (NOP)                                       |
| `stop`         | Ferma l'evento (NOP)                                       |
| `dispose`      | Pulizia completa: libera la memoria, distrugge i callback  |

Questo consente:
- Sospendere e riprendere le coroutine tramite callback degli eventi
- Integrare il timer di healthcheck con il reactor
- Rilasciare correttamente le risorse attraverso la disposizione degli eventi

## Garbage Collection

Il wrapper PHP del pool (`async_pool_obj_t`) implementa un `get_gc` personalizzato
che registra tutte le risorse dal buffer idle come radici GC.
Questo previene la raccolta prematura delle risorse libere
che non hanno riferimenti espliciti dal codice PHP.

## Circuit Breaker

Il pool implementa l'interfaccia `CircuitBreaker` con tre stati:

![Stati del Circuit Breaker](/diagrams/it/architecture-pool/circuit-breaker.svg)

Le transizioni possono essere manuali o automatiche tramite `CircuitBreakerStrategy`:
- `reportSuccess()` viene chiamato su un `release` riuscito (la risorsa ha passato `beforeRelease`)
- `reportFailure()` viene chiamato quando `beforeRelease` ha restituito `false`
- La strategia decide quando cambiare stato

## Close: Chiusura del Pool

Quando il pool viene chiuso:

1. L'evento del pool viene contrassegnato come CLOSED
2. Il timer di healthcheck viene fermato
3. Tutte le coroutine in attesa vengono svegliate con una `PoolException`
4. Tutte le risorse libere vengono distrutte tramite `destructor`
5. Le risorse occupate continuano a vivere -- verranno distrutte al `release`

## API C per le Estensioni

Le estensioni (PDO, Redis, ecc.) utilizzano il pool attraverso macro:

| Macro                                            | Funzione                         |
|--------------------------------------------------|----------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Crea il pool con callback C      |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | Crea il wrapper PHP per il pool  |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Acquisisce una risorsa           |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Rilascia una risorsa             |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Chiude il pool                   |

Tutte le macro chiamano puntatori a funzione registrati dall'estensione async al momento del caricamento.
Questo garantisce l'isolamento: il core PHP non dipende dall'implementazione specifica del pool.

## Sequenza: Ciclo Completo Acquire-Release

![Ciclo Completo acquire -> use -> release](/diagrams/it/architecture-pool/full-cycle.svg)

## Prossimi Passi

- [Async\Pool: Guida](/it/docs/components/pool.html) -- come usare il pool
- [Architettura PDO Pool](/it/architecture/pdo-pool.html) -- livello specifico PDO
- [Coroutine](/it/docs/components/coroutines.html) -- come funzionano le coroutine
