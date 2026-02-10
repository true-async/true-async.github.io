---
layout: page
lang: it
path_key: "/motivation.html"
nav_active: motivation
permalink: /it/motivation.html
page_title: "Motivazione"
description: "Perché PHP ha bisogno di capacità asincrone integrate"
---

## Perché PHP ha bisogno dell'asincronicità?

`PHP` è uno degli ultimi grandi linguaggi che ancora non dispone di supporto integrato
per l'esecuzione concorrente **a livello di linguaggio**. Python ha `asyncio`, `JavaScript` è nativamente
costruito su un event loop, `Go` ha le goroutine, `Kotlin` ha le coroutine. `PHP` rimane
nel paradigma «una richiesta — un processo», nonostante la maggior parte
delle applicazioni reali passi la maggior parte del tempo in attesa di `I/O` (`IO Bound`).

## Il problema della frammentazione

Oggi l'asincronicità in `PHP` è implementata tramite estensioni: `Swoole`, `AMPHP`, `ReactPHP`.
Ognuna crea **il proprio ecosistema** con `API` incompatibili,
propri driver per database, client `HTTP` e server.

Questo porta a problemi critici:

- **Duplicazione del codice** — ogni estensione è costretta a riscrivere i driver
  per `MySQL`, `PostgreSQL`, `Redis` e altri sistemi
- **Incompatibilità** — una libreria scritta per `Swoole` non funziona con `AMPHP`,
  e viceversa
- **Limitazioni** — le estensioni non possono rendere le funzioni standard di `PHP`
  (`file_get_contents`, `fread`, `curl_exec`) non bloccanti,
  perché non hanno accesso al core
- **Barriera all'ingresso** — gli sviluppatori devono imparare un ecosistema separato
  invece di usare strumenti familiari

## La soluzione: integrazione nel core

`TrueAsync` propone un approccio diverso — **asincronicità a livello del core di PHP**.
Questo significa:

### Trasparenza

Il codice sincrono esistente funziona nelle coroutine senza modifiche.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — tutte queste funzioni
diventano automaticamente non bloccanti quando eseguite all'interno di una coroutine.

```php
// Questo codice è già eseguito in modo concorrente!
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // la coroutine si sospende durante la richiesta HTTP,
    // le altre coroutine continuano a essere eseguite
});
```

### Nessuna funzione colorata

A differenza di Python (`async def` / `await`) e JavaScript (`async` / `await`),
`TrueAsync` non richiede di contrassegnare le funzioni come asincrone.
Qualsiasi funzione può essere eseguita in una coroutine — non c'è separazione
tra un mondo «sincrono» e «asincrono».

### Uno standard unificato

Il `True Async ABI` standard come parte di `Zend` permette a **qualsiasi** estensione di supportare `I/O` non bloccante:
`MySQL`, `PostgreSQL`, `Redis`, operazioni su file, socket — tutto attraverso un'unica interfaccia.
Non è più necessario duplicare i driver per ogni framework asincrono.

### Retrocompatibilità

Il codice esistente continua a funzionare, ma ora tutto il codice PHP
è asincrono per impostazione predefinita. Ovunque.

## PHP workload: perché è importante proprio adesso

Un'applicazione PHP tipica (Laravel, Symfony, WordPress) passa
**il 70–90% del tempo in attesa di I/O**: query al DB, chiamate HTTP ad API esterne,
lettura di file. Per tutto quel tempo, la CPU resta inattiva.

Con le coroutine, questo tempo viene utilizzato in modo efficiente:

| Scenario                           | Senza coroutine | Con coroutine    |
|------------------------------------|-----------------|------------------|
| 3 query al DB da 20ms ciascuna    | 60ms            | ~22ms            |
| HTTP + DB + file                   | sequenziale     | parallelo        |
| 10 chiamate API                    | 10 × latenza    | ~1 × latenza     |

Approfondimenti:
[IO-Bound vs CPU-Bound](/it/docs/evidence/concurrency-efficiency.html),
[Statistiche di concorrenza](/it/docs/evidence/real-world-statistics.html).

## Scenari pratici

- **Server web** — gestione di molte richieste in un singolo processo
  (`FrankenPHP`, `RoadRunner`)
- **API Gateway** — aggregazione parallela di dati da più microservizi
- **Attività in background** — elaborazione concorrente delle code
- **Tempo reale** — server WebSocket, chatbot, streaming

## Vedi anche:

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope e concorrenza strutturata](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [Documentazione TrueAsync](/it/docs.html)
- [Demo interattiva delle coroutine](/it/interactive/coroutine-demo.html)
