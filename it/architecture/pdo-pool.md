---
layout: architecture
lang: it
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /it/architecture/pdo-pool.html
page_title: "Architettura PDO Pool"
description: "Progettazione interna del PDO Pool -- componenti, ciclo di vita delle connessioni, binding alle coroutine, gestione delle credenziali."
---

# Architettura PDO Pool

> Questo articolo descrive la progettazione interna del PDO Pool.
> Se stai cercando una guida all'uso, vedi [PDO Pool: Pool di Connessioni](/it/docs/components/pdo-pool.html).

## Architettura a Due Livelli

Il PDO Pool è composto da due livelli:

**1. PDO Core (`pdo_pool.c`)** -- logica per il binding delle connessioni alle coroutine,
gestione delle transazioni, conteggio dei riferimenti degli statement.

**2. Async Pool (`zend_async_pool_t`)** -- il pool di risorse universale dell'estensione async.
Gestisce la coda delle connessioni libere, i limiti e gli healthcheck.
Non sa nulla del PDO -- lavora con valori `zval` astratti.

Questa separazione consente di utilizzare lo stesso meccanismo di pooling
per qualsiasi risorsa, non solo database.

## Diagramma dei Componenti

![PDO Pool -- Componenti](/diagrams/it/architecture-pdo-pool/components.svg)

## Connessione Template

Quando si crea un `PDO` con un pool, il core **non apre** una connessione TCP reale.
Invece, viene creato un **template** -- un oggetto `pdo_dbh_t` che memorizza
il DSN, il nome utente, la password e un riferimento al driver. Tutte le connessioni reali vengono create successivamente,
su richiesta, sulla base di questo template.

Per il template, viene chiamato `db_handle_init_methods()` invece di `db_handle_factory()`.
Questo metodo imposta la tabella dei metodi del driver (`dbh->methods`)
ma non crea una connessione TCP né alloca `driver_data`.

## Ciclo di Vita della Connessione

![Ciclo di Vita della Connessione nel Pool](/diagrams/it/architecture-pdo-pool/lifecycle.svg)

## Creazione di una Connessione dal Pool (Sequenza)

![Creazione di una Connessione dal Pool](/diagrams/it/architecture-pdo-pool/connection-sequence.svg)

## API Interna

### pdo_pool.c -- Funzioni Pubbliche

| Funzione                   | Scopo                                                          |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | Crea un pool per `pdo_dbh_t` basato sugli attributi del costruttore |
| `pdo_pool_destroy()`       | Rilascia tutte le connessioni, chiude il pool, svuota la tabella hash |
| `pdo_pool_acquire_conn()`  | Restituisce una connessione per la coroutine corrente (riuso o acquire) |
| `pdo_pool_peek_conn()`     | Restituisce la connessione associata senza acquire (NULL se nessuna) |
| `pdo_pool_maybe_release()` | Restituisce la connessione al pool se non ci sono transazioni o statement |
| `pdo_pool_get_wrapper()`   | Restituisce l'oggetto PHP `Async\Pool` per il metodo `getPool()` |

### pdo_pool.c -- Callback Interni

| Callback                    | Quando Viene Chiamato                                     |
|-----------------------------|-----------------------------------------------------------|
| `pdo_pool_factory()`        | Il pool necessita di una nuova connessione (acquire quando il pool è vuoto) |
| `pdo_pool_destructor()`     | Il pool distrugge una connessione (alla chiusura o all'evizione) |
| `pdo_pool_healthcheck()`    | Controllo periodico -- la connessione è ancora attiva?    |
| `pdo_pool_before_release()` | Prima del ritorno al pool -- rollback delle transazioni non committate |
| `pdo_pool_free_conn()`      | Chiude la connessione del driver, libera la memoria       |

### Binding alla Coroutine

Le connessioni sono associate alle coroutine tramite una tabella hash `pool_connections`,
dove la chiave è l'identificatore della coroutine e il valore è un puntatore a `pdo_dbh_t`.

L'identificatore della coroutine viene calcolato dalla funzione `pdo_pool_coro_key()`:
- Se la coroutine è un oggetto PHP -- viene usato `zend_object.handle` (uint32_t sequenziale)
- Per le coroutine interne -- l'indirizzo del puntatore spostato di `ZEND_MM_ALIGNMENT_LOG2`

### Pulizia al Completamento della Coroutine

Quando una connessione è associata a una coroutine, viene registrato un `pdo_pool_cleanup_callback`
tramite `coro->event.add_callback()`. Quando la coroutine si completa (normalmente o con un errore),
il callback restituisce automaticamente la connessione al pool. Questo garantisce nessuna perdita di connessioni
anche con eccezioni non gestite.

### Pinning: Blocco della Connessione

Una connessione è bloccata su una coroutine e non tornerà al pool se almeno una condizione è soddisfatta:

- `conn->in_txn == true` -- una transazione attiva
- `conn->pool_slot_refcount > 0` -- ci sono statement live (`PDOStatement`) che usano questa connessione

Il refcount viene incrementato quando uno statement viene creato e decrementato quando viene distrutto.
Quando entrambe le condizioni sono azzerate, `pdo_pool_maybe_release()` restituisce la connessione al pool.

## Gestione delle Credenziali nella Factory

Quando si crea una nuova connessione, `pdo_pool_factory()` **copia** le
stringhe DSN, nome utente e password dal template tramite `estrdup()`. Questo è necessario perché
i driver possono mutare questi campi durante `db_handle_factory()`:

- **PostgreSQL** -- sostituisce `;` con spazi in `data_source`
- **MySQL** -- alloca `username`/`password` dal DSN se non sono stati passati
- **ODBC** -- ricostruisce completamente `data_source`, incorporando le credenziali

Dopo una chiamata `db_handle_factory()` riuscita, le copie vengono liberate tramite `efree()`.
In caso di errore, la liberazione avviene attraverso `pdo_pool_free_conn()`,
che viene utilizzato anche dal distruttore del pool.

## Incompatibilità con le Connessioni Persistenti

Le connessioni persistenti (`PDO::ATTR_PERSISTENT`) sono incompatibili con il pool.
Una connessione persistente è legata al processo e sopravvive alle richieste,
mentre il pool crea connessioni a livello di richiesta con gestione automatica del ciclo di vita.
Il tentativo di abilitare entrambi gli attributi contemporaneamente risulterà in un errore.

## Prossimi Passi

- [PDO Pool: Pool di Connessioni](/it/docs/components/pdo-pool.html) -- guida all'uso
- [Coroutine](/it/docs/components/coroutines.html) -- come funzionano le coroutine
- [Scope](/it/docs/components/scope.html) -- gestione dei gruppi di coroutine
