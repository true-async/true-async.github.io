---
layout: docs
lang: it
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /it/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio in pratica: Duolingo, Super.com, Instagram, benchmark uvloop, contro-argomenti."
---

# Python asyncio in pratica: misurazioni reali

Python e' il linguaggio piu' simile a PHP in termini di modello di esecuzione:
interpretato, single-threaded (GIL), con una dominanza di framework sincroni.
La transizione dal Python sincrono (Flask, Django + Gunicorn) all'asincrono
(FastAPI, aiohttp, Starlette + Uvicorn) e' un'analogia precisa della transizione
da PHP-FPM a un runtime basato su coroutine.

Di seguito una raccolta di casi di produzione, benchmark indipendenti e misurazioni.

---

## 1. Produzione: Duolingo — Migrazione a Python asincrono (+40% throughput)

[Duolingo](https://blog.duolingo.com/async-python-migration/) e' la piu' grande
piattaforma di apprendimento linguistico (500M+ utenti).
Il backend e' scritto in Python.

Nel 2025, il team ha iniziato una migrazione sistematica dei servizi dal Python sincrono
all'asincrono.

| Metrica                 | Risultato                               |
|-------------------------|-----------------------------------------|
| Throughput per istanza  | **+40%**                                |
| Risparmio costi AWS EC2 | **~30%** per servizio migrato           |

Gli autori notano che dopo aver costruito l'infrastruttura asincrona, la migrazione
dei singoli servizi si e' rivelata "abbastanza semplice".

**Fonte:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Produzione: Super.com — Riduzione dei costi del 90%

[Super.com](https://www.super.com/) (precedentemente Snaptravel) e' un servizio di ricerca hotel
e sconti. Il loro motore di ricerca gestisce 1.000+ req/s,
ingerisce 1 TB+ di dati al giorno ed elabora $1M+ in vendite giornaliere.

**Caratteristica chiave del carico di lavoro:** ogni richiesta effettua **40+ chiamate di rete**
verso API di terze parti. Questo e' un profilo puramente I/O-bound — un candidato ideale per le coroutine.

Il team ha migrato da Flask (sincrono, AWS Lambda) a Quart (ASGI, EC2).

| Metrica                  | Flask (Lambda) | Quart (ASGI)  | Variazione     |
|--------------------------|----------------|---------------|----------------|
| Costi infrastruttura     | ~$1.000/giorno | ~$50/giorno   | **−90%**       |
| Throughput               | ~150 req/s     | 300+ req/s    | **2x**         |
| Errori nelle ore di punta| Baseline       | −95%          | **−95%**       |
| Latenza                  | Baseline       | −50%          | **2x piu' veloce** |

Risparmio di $950/giorno × 365 = **~$350.000/anno** su un singolo servizio.

**Fonte:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Produzione: Instagram — asyncio alla scala di 500M DAU

Instagram serve 500+ milioni di utenti attivi giornalieri
su un backend Django.

Jimmy Lai (ingegnere di Instagram) ha descritto la migrazione ad asyncio in un talk
al PyCon Taiwan 2018:

- Sostituzione di `requests` con `aiohttp` per le chiamate HTTP
- Migrazione dell'RPC interno ad `asyncio`
- Ottenuto miglioramento delle prestazioni API e riduzione del tempo di inattivita' della CPU

**Sfide:** Elevato overhead CPU di asyncio alla scala di Instagram,
la necessita' di rilevamento automatico delle chiamate bloccanti attraverso
analisi statica del codice.

**Fonte:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Produzione: Feature Store — Da thread a asyncio (−40% latenza)

Il servizio Feature Store ha migrato dal multithreading Python ad asyncio.

| Metrica         | Thread                   | Asyncio              | Variazione              |
|-----------------|--------------------------|----------------------|-------------------------|
| Latenza         | Baseline                 | −40%                 | **−40%**                |
| Consumo RAM     | 18 GB (centinaia di thread) | Significativamente meno | Riduzione sostanziale |

La migrazione e' stata effettuata in tre fasi con suddivisione 50/50
del traffico di produzione per la validazione.

**Fonte:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Produzione: Talk Python — Da Flask a Quart (−81% latenza)

[Talk Python](https://talkpython.fm/) e' uno dei piu' grandi podcast
e piattaforme di apprendimento Python. L'autore (Michael Kennedy) ha riscritto il sito
da Flask (sincrono) a Quart (Flask asincrono).

| Metrica                | Flask | Quart | Variazione  |
|------------------------|-------|-------|-------------|
| Tempo di risposta (es.) | 42 ms | 8 ms | **−81%**   |
| Bug dopo la migrazione | —     | 2     | Minimi      |

L'autore nota: durante i test di carico, il massimo req/s
differiva in modo insignificante perche' le query MongoDB richiedevano <1 ms.
Il guadagno appare durante l'elaborazione di richieste **concorrenti** —
quando piu' client accedono al server simultaneamente.

**Fonte:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop come standard

Microsoft ha incluso [uvloop](https://github.com/MagicStack/uvloop) —
un event loop veloce basato su libuv — come predefinito per Azure Functions
su Python 3.13+.

| Test                           | asyncio standard | uvloop      | Miglioramento |
|--------------------------------|------------------|-------------|---------------|
| 10K richieste, 50 VU (locale) | 515 req/s        | 565 req/s   | **+10%**      |
| 5 min, 100 VU (Azure)         | 1.898 req/s      | 1.961 req/s | **+3%**       |
| 500 VU (locale)               | 720 req/s        | 772 req/s   | **+7%**       |

L'event loop standard a 500 VU ha mostrato **~2% di perdita di richieste**.
uvloop — zero errori.

**Fonte:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Benchmark: task I/O-bound — asyncio 130x piu' veloce

Confronto diretto dei modelli di concorrenza su un task di download di 10.000 URL:

| Modello        | Tempo    | Throughput     | Errori    |
|----------------|----------|----------------|-----------|
| Sincrono       | ~1.800 s | ~11 KB/s       | —         |
| Thread (100)   | ~85 s    | ~238 KB/s      | Bassi     |
| **Asyncio**    | **14 s** | **1.435 KB/s** | **0,06%** |

Asyncio: **130x piu' veloce** del codice sincrono, **6x piu' veloce** dei thread.

Per i task CPU-bound, asyncio non fornisce alcun vantaggio
(tempo identico, +44% consumo di memoria).

**Fonte:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Benchmark: uvloop — piu' veloce di Go e Node.js

[uvloop](https://github.com/MagicStack/uvloop) e' un sostituto drop-in per l'event loop
standard di asyncio, scritto in Cython su libuv (la stessa libreria
alla base di Node.js).

Server TCP echo:

| Implementazione       | 1 KiB (req/s) | 100 KiB throughput |
|-----------------------|---------------|--------------------|
| **uvloop**            | **105.459**   | **2,3 GiB/s**      |
| Go                    | 103.264       | —                  |
| asyncio standard      | 41.420        | —                  |
| Node.js               | 44.055        | —                  |

Server HTTP (300 concorrenti):

| Implementazione          | 1 KiB (req/s) |
|--------------------------|---------------|
| **uvloop + httptools**   | **37.866**    |
| Node.js                  | Inferiore     |

uvloop: **2,5x piu' veloce** dell'asyncio standard, **2x piu' veloce** di Node.js,
**alla pari con Go**.

**Fonte:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Benchmark: aiohttp vs requests — 10x sulle richieste concorrenti

| Libreria      | req/s (concorrenti) | Tipo  |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp: **10x piu' veloce** di Requests per le richieste HTTP concorrenti.

**Fonte:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Contro-argomento: Cal Paterson — "Python asincrono non e' piu' veloce"

E' importante presentare anche i contro-argomenti. Cal Paterson ha condotto un benchmark approfondito
con un **database reale** (PostgreSQL, selezione casuale di righe + JSON):

| Framework                      | Tipo  | req/s     | Latenza P99 |
|--------------------------------|-------|-----------|-------------|
| Gunicorn + Meinheld/Bottle     | Sync  | **5.780** | **32 ms**   |
| Gunicorn + Meinheld/Falcon     | Sync  | **5.589** | **31 ms**   |
| Uvicorn + Starlette            | Async | 4.952     | 75 ms       |
| Sanic                          | Async | 4.687     | 85 ms       |
| AIOHTTP                        | Async | 4.501     | 76 ms       |

**Risultato:** i framework sincroni con server C hanno mostrato **throughput superiore**
e **latenza di coda 2–3x migliore** (P99).

### Perche' l'asincrono ha perso?

Motivi:

1. **Una singola query SQL** per richiesta HTTP — troppo poco I/O
   perche' la concorrenza delle coroutine abbia effetto.
2. **Il multitasking cooperativo** con lavoro CPU tra le richieste
   crea una distribuzione "ingiusta" del tempo CPU —
   calcoli lunghi bloccano l'event loop per tutti.
3. **L'overhead di asyncio** (event loop standard in Python)
   e' paragonabile al guadagno dall'I/O non bloccante quando l'I/O e' minimo.

### Quando l'asincrono aiuta davvero

Il benchmark di Paterson testa lo **scenario piu' semplice** (1 query SQL).
Come dimostrano i casi di produzione sopra, l'asincrono fornisce un guadagno drammatico quando:

- Ci sono **molte** query DB / API esterne (Super.com: 40+ chiamate per richiesta)
- La concorrenza e' **elevata** (migliaia di connessioni simultanee)
- L'I/O **domina** sulla CPU (Duolingo, Appwrite)

Questo e' in linea con la teoria:
piu' alto e' il coefficiente di blocco (T_io/T_cpu), maggiore e' il beneficio dalle coroutine.
Con 1 query SQL × 2 ms, il coefficiente e' troppo basso.

**Fonte:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: framework Python

Risultati approssimativi da [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Framework         | Tipo       | req/s (JSON)          |
|-------------------|------------|-----------------------|
| Uvicorn (raw)     | Async ASGI | Il piu' alto tra Python |
| Starlette         | Async ASGI | ~20.000–25.000        |
| FastAPI           | Async ASGI | ~15.000–22.000        |
| Flask (Gunicorn)  | Sync WSGI  | ~4.000–6.000          |
| Django (Gunicorn) | Sync WSGI  | ~2.000–4.000          |

Framework asincroni: **3–5x** piu' veloci di quelli sincroni nel test JSON.

**Fonte:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Riepilogo: cosa mostrano i dati Python

| Caso                        | Sincrono → Asincrono                   | Condizione                             |
|-----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (produzione)       | **+40%** throughput, **−30%** costi    | Microservizi, I/O                      |
| Super.com (produzione)      | **2x** throughput, **−90%** costi      | 40+ chiamate API per richiesta         |
| Feature Store (produzione)  | **−40%** latenza                       | Migrazione da thread a asyncio         |
| Talk Python (produzione)    | **−81%** latenza                       | Flask → Quart                          |
| I/O-bound (10K URL)         | **130x** piu' veloce                   | Puro I/O, concorrenza massiva          |
| aiohttp vs requests         | **10x** piu' veloce                    | Richieste HTTP concorrenti             |
| uvloop vs standard          | **2,5x** piu' veloce                   | TCP echo, HTTP                         |
| TechEmpower JSON            | **3–5x**                               | FastAPI/Starlette vs Flask/Django      |
| **CRUD semplice (1 SQL)**   | **Sincrono e' piu' veloce**            | Cal Paterson: P99 2–3x peggiore per async |
| **CPU-bound**               | **Nessuna differenza**                 | +44% memoria, 0% guadagno             |

### Conclusione chiave

Python asincrono fornisce il massimo beneficio con un **alto coefficiente di blocco**:
quando il tempo di I/O supera significativamente il tempo CPU.
Con 40+ chiamate di rete (Super.com) — 90% di risparmio sui costi.
Con 1 query SQL (Cal Paterson) — l'asincrono e' piu' lento.

Questo **conferma la formula** di [Efficienza dei task IO-bound](/it/docs/evidence/concurrency-efficiency.html):
guadagno ≈ 1 + T_io/T_cpu. Quando T_io >> T_cpu — decine o centinaia di volte.
Quando T_io ≈ T_cpu — minimo o zero.

---

## Connessione con PHP e True Async

Python e PHP si trovano in una situazione simile:

| Caratteristica           | Python               | PHP                 |
|--------------------------|----------------------|---------------------|
| Interpretato             | Si'                  | Si'                 |
| GIL / single-threaded    | GIL                  | Single-threaded     |
| Modello dominante        | Sync (Django, Flask) | Sync (FPM)          |
| Runtime asincrono        | asyncio + uvloop     | Swoole / True Async |
| Framework asincrono      | FastAPI, Starlette   | Hyperf              |

I dati Python mostrano che la transizione alle coroutine in un linguaggio
interpretato single-threaded **funziona**. L'entita' del guadagno
e' determinata dal profilo del carico di lavoro, non dal linguaggio.

---

## Riferimenti

### Casi di produzione
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Benchmark
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Coroutine vs thread
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
