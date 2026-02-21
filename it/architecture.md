---
layout: architecture
lang: it
path_key: "/architecture.html"
nav_active: architecture
permalink: /it/architecture.html
page_title: "Architettura"
description: "Progettazione interna dei componenti TrueAsync -- pool di risorse, PDO Pool, diagrammi e API C."
---

## Panoramica

La sezione architettura descrive la progettazione interna dei componenti chiave di TrueAsync
a livello di codice C: strutture dati, algoritmi, integrazione con Zend Engine
e interazione tra il core PHP e l'estensione async.

Questi materiali sono destinati agli sviluppatori che vogliono capire
come funziona TrueAsync "sotto il cofano" o che intendono creare le proprie
estensioni.

### [TrueAsync ABI](/it/architecture/zend-async-api.html)

Il cuore dell'ABI asincrona: puntatori a funzione, sistema di registrazione delle estensioni,
stato globale (`zend_async_globals_t`), macro `ZEND_ASYNC_*`
e versionamento dell'API.

### [Coroutine, Scheduler e Reactor](/it/architecture/scheduler-reactor.html)

Progettazione interna dello scheduler delle coroutine e del reactor degli eventi:
code (buffer circolari), cambio di contesto tramite fiber,
microtask, loop degli eventi libuv, pool di contesti fiber e arresto controllato.

### [Eventi e Modello degli Eventi](/it/architecture/events.html)

`zend_async_event_t` -- la struttura dati base da cui
ereditano tutte le primitive asincrone. Sistema di callback, ref-counting,
riferimento agli eventi, flag, gerarchia dei tipi di evento.

### [Waker -- Meccanismo di Attesa e Risveglio](/it/architecture/waker.html)

Il Waker è il collegamento tra una coroutine e gli eventi.
Stati, `resume_when`, callback delle coroutine, consegna degli errori,
struttura `zend_coroutine_t` e switch handler.

### [Garbage Collection nel Contesto Asincrono](/it/architecture/async-gc.html)

Come il GC di PHP funziona con coroutine, scope e contesti: handler `get_gc`,
attraversamento dello stack fiber, coroutine zombie, contesto gerarchico
e protezione contro i riferimenti circolari.

## Componenti

### [Async\Pool](/it/architecture/pool.html)

Pool di risorse universale. Argomenti trattati:
- Struttura dati a due livelli (ABI nel core + interna nell'estensione)
- Algoritmi di acquire/release con una coda FIFO di coroutine in attesa
- Healthcheck tramite timer periodico
- Circuit Breaker con tre stati
- API C per le estensioni (macro `ZEND_ASYNC_POOL_*`)

### [PDO Pool](/it/architecture/pdo-pool.html)

Layer specifico per PDO sopra `Async\Pool`. Argomenti trattati:
- Connessione template e creazione differita delle connessioni reali
- Binding delle connessioni alle coroutine tramite HashTable
- Pinning durante transazioni e statement attivi
- Rollback automatico e pulizia al completamento della coroutine
- Gestione delle credenziali nella factory
