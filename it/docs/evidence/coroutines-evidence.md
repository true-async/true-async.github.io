---
layout: docs
lang: it
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /it/docs/evidence/coroutines-evidence.html
page_title: "Perche' le coroutine funzionano"
description: "Evidenza empirica: misurazioni del costo del context switch, confronto della memoria, il problema C10K, ricerca accademica."
---

# Evidenza empirica: perche' le coroutine single-threaded funzionano

L'affermazione che la concorrenza cooperativa single-threaded sia efficace
per i carichi di lavoro IO-bound e' supportata da misurazioni, ricerca accademica
ed esperienza operativa con sistemi su larga scala.

---

## 1. Costo del cambio di contesto: coroutine vs thread del sistema operativo

Il principale vantaggio delle coroutine e' che il cambio cooperativo avviene
nello spazio utente, senza invocare il kernel del sistema operativo.

### Misurazioni su Linux

| Metrica                | Thread del SO (Linux NPTL)               | Coroutine / task asincrono             |
|------------------------|------------------------------------------|----------------------------------------|
| Context switch         | 1,2–1,5 µs (pinned), ~2,2 µs (unpinned) | ~170 ns (Go), ~200 ns (Rust async)     |
| Creazione del task     | ~17 µs                                   | ~0,3 µs                               |
| Memoria per task       | ~9,5 KiB (min), 8 MiB (stack predefinito)| ~0,4 KiB (Rust), 2–4 KiB (Go)         |
| Scalabilita'           | ~80.000 thread (test)                    | 250.000+ task asincroni (test)         |

**Fonti:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  misurazioni dirette dei costi di switching dei thread Linux e confronto con le goroutine
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  il cambio di task asincroni in ~0,2 µs vs ~1,7 µs per un thread (**8,5x** piu' veloce),
  creato in 0,3 µs vs 17 µs (**56x** piu' veloce), utilizza 0,4 KiB vs 9,5 KiB (**24x** in meno)

### Cosa significa in pratica

Il cambio di una coroutine costa **~200 nanosecondi** — un ordine di grandezza piu' economico
del cambio di un thread del sistema operativo (~1,5 µs).
Ma ancora piu' importante, il cambio di coroutine **non comporta costi indiretti**:
flush della cache TLB, invalidazione del branch predictor, migrazione tra core —
tutti questi sono caratteristici dei thread, ma non delle coroutine all'interno di un singolo thread.

Per un event loop che gestisce 80 coroutine per core,
l'overhead totale del cambio e':

```
80 × 200 ns = 16 µs per un ciclo completo attraverso tutte le coroutine
```

Questo e' trascurabile rispetto a 80 ms di tempo di attesa I/O.

---

## 2. Memoria: ordine di grandezza delle differenze

I thread del sistema operativo allocano uno stack di dimensione fissa (8 MiB per impostazione predefinita su Linux).
Le coroutine memorizzano solo il loro stato — variabili locali e il punto di ripresa.

| Implementazione                | Memoria per unita' di concorrenza                         |
|--------------------------------|-----------------------------------------------------------|
| Thread Linux (stack predefinito)| 8 MiB virtuali, ~10 KiB RSS minimo                      |
| Goroutine Go                   | 2–4 KiB (stack dinamico, cresce secondo necessita')      |
| Coroutine Kotlin               | decine di byte sull'heap; rapporto thread:coroutine ≈ 6:1|
| Task asincrono Rust            | ~0,4 KiB                                                 |
| Frame coroutine C++ (Pigweed)  | 88–408 byte                                              |
| Coroutine Python asyncio       | ~2 KiB (vs ~5 KiB + 32 KiB stack per un thread)         |

**Fonti:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — rapporto di memoria 6:1
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — confronto in Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — stack dinamico delle goroutine

### Implicazioni per i web server

Per 640 task concorrenti (8 core × 80 coroutine):

- **Thread del SO**: 640 × 8 MiB = 5 GiB di memoria virtuale
  (in realta' meno grazie all'allocazione lazy, ma la pressione sullo scheduler del SO e' significativa)
- **Coroutine**: 640 × 4 KiB = 2,5 MiB
  (una differenza di **tre ordini di grandezza**)

---

## 3. Il problema C10K e i server reali

### Il problema

Nel 1999, Dan Kegel formulo' il
[problema C10K](https://www.kegel.com/c10k.html):
i server che utilizzavano il modello "un thread per connessione" non erano in grado di servire
10.000 connessioni simultanee.
La causa non erano le limitazioni hardware, ma l'overhead dei thread del sistema operativo.

### La soluzione

Il problema fu risolto con la transizione a un'architettura event-driven:
invece di creare un thread per ogni connessione,
un singolo event loop serve migliaia di connessioni in un thread.

Questo e' esattamente l'approccio implementato da **nginx**, **Node.js**, **libuv** e — nel contesto PHP — **True Async**.

### Benchmark: nginx (event-driven) vs Apache (thread-per-request)

| Metrica (1000 connessioni concorrenti)  | nginx        | Apache                           |
|-----------------------------------------|--------------|----------------------------------|
| Richieste al secondo (statiche)         | 2.500–3.000  | 800–1.200                        |
| Throughput HTTP/2                       | >6.000 req/s | ~826 req/s                       |
| Stabilita' sotto carico                 | Stabile      | Degradazione a >150 connessioni  |

nginx serve **2–4x** piu' richieste di Apache,
consumando significativamente meno memoria.
Apache con architettura thread-per-request accetta non piu' di 150 connessioni simultanee
(per impostazione predefinita), dopo di che i nuovi client attendono in coda.

**Fonti:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — formulazione del problema
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — benchmark
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — esperienza industriale

---

## 4. Ricerca accademica

### SEDA: Staged Event-Driven Architecture (Welsh et al., 2001)

Matt Welsh, David Culler ed Eric Brewer dell'UC Berkeley proposero
SEDA — un'architettura server basata su eventi e code tra le fasi di elaborazione.

**Risultato chiave**: Il server SEDA in Java supero'
Apache (C, thread-per-connection) in throughput con 10.000+ connessioni simultanee.
Apache non riusciva ad accettare piu' di 150 connessioni simultanee.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Confronto di architetture di web server (Pariag et al., 2007)

Il confronto piu' approfondito delle architetture fu condotto da Pariag et al.
dell'Universita' di Waterloo. Confrontarono tre server sulla stessa base di codice:

- **µserver** — event-driven (SYMPED, singolo processo)
- **Knot** — thread-per-connection (libreria Capriccio)
- **WatPipe** — ibrido (pipeline, simile a SEDA)

**Risultato chiave**: Il µserver event-driven e il WatPipe basato su pipeline
hanno fornito un **throughput superiore del ~18%** rispetto al Knot basato su thread.
WatPipe necessitava di 25 thread writer per raggiungere le stesse prestazioni
del µserver con 10 processi.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: elaborazione accelerata di eventi con coroutine (2022)

Uno studio pubblicato su arXiv ha condotto un confronto diretto
tra coroutine e thread per l'elaborazione di dati in streaming (elaborazione basata su eventi).

**Risultato chiave**: Le coroutine hanno fornito **almeno il doppio del throughput**
rispetto ai thread convenzionali per l'elaborazione di stream di eventi.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Scalabilita': 100.000 task

### Kotlin: 100.000 coroutine in 100 ms

Nel benchmark di [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/),
la creazione e il lancio di 100.000 coroutine ha richiesto ~100 ms di overhead.
Un numero equivalente di thread richiederebbe ~1,7 secondi solo per la creazione
(100.000 × 17 µs) e ~950 MiB di memoria per gli stack.

### Rust: 250.000 task asincroni

Nel [benchmark context-switch](https://github.com/jimblandy/context-switch),
250.000 task asincroni sono stati lanciati in un singolo processo,
mentre i thread del sistema operativo hanno raggiunto il loro limite a ~80.000.

### Go: milioni di goroutine

Go lancia abitualmente centinaia di migliaia e milioni di goroutine nei sistemi di produzione.
Questo e' cio' che permette a server come Caddy, Traefik e CockroachDB
di gestire decine di migliaia di connessioni simultanee.

---

## 6. Riepilogo delle evidenze

| Affermazione                                        | Conferma                                                  |
|-----------------------------------------------------|-----------------------------------------------------------|
| Il cambio di coroutine e' piu' economico dei thread | ~200 ns vs ~1500 ns — **7–8x** (Bendersky 2018, Blandy)  |
| Le coroutine consumano meno memoria                 | 0,4–4 KiB vs 9,5 KiB–8 MiB — **24x+** (Blandy, Go FAQ)  |
| Il server event-driven scala meglio                  | nginx 2–4x throughput vs Apache (benchmark)               |
| Event-driven > thread-per-connection (accademicamente)| +18% throughput (Pariag 2007), C10K risolto (Kegel 1999) |
| Coroutine > thread per elaborazione eventi           | 2x throughput (AEStream 2022)                             |
| Centinaia di migliaia di coroutine in un processo    | 250K task asincroni (Rust), 100K coroutine in 100ms (Kotlin)|
| La formula N ≈ 1 + T_io/T_cpu e' corretta           | Goetz 2006, Zalando, Legge di Little                      |

---

## Riferimenti

### Misurazioni e benchmark
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Articoli accademici
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Esperienza industriale
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### Vedi anche
- [Python asyncio in pratica](/it/docs/evidence/python-evidence.html) — casi di produzione (Duolingo, Super.com, Instagram), benchmark uvloop, contro-argomenti di Cal Paterson
- [Swoole in pratica](/it/docs/evidence/swoole-evidence.html) — casi di produzione e benchmark per le coroutine PHP
