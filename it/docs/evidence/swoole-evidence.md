---
layout: docs
lang: it
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /it/docs/evidence/swoole-evidence.html
page_title: "Swoole in pratica"
description: "Swoole in pratica: casi di produzione da Appwrite e IdleMMO, benchmark indipendenti, TechEmpower, confronto con PHP-FPM."
---

# Swoole in pratica: misurazioni reali

Swoole e' un'estensione PHP scritta in C che fornisce un event loop, coroutine
e I/O asincrono. E' l'unica implementazione matura del modello a coroutine
nell'ecosistema PHP con anni di esperienza in produzione.

Di seguito una raccolta di misurazioni reali: casi di produzione, benchmark indipendenti
e dati TechEmpower.

### Due fonti di guadagno prestazionale

La transizione da PHP-FPM a Swoole fornisce **due vantaggi indipendenti**:

1. **Runtime stateful** — l'applicazione si carica una volta e rimane in memoria.
   L'overhead della re-inizializzazione (autoload, container DI, configurazione)
   ad ogni richiesta scompare. Questo effetto fornisce un guadagno anche senza I/O.

2. **Concorrenza con coroutine** — mentre una coroutine attende la risposta del DB o di un'API esterna,
   le altre elaborano richieste sullo stesso core. Questo effetto si manifesta
   **solo quando e' presente I/O** e richiede l'uso di client asincroni
   (MySQL basato su coroutine, Redis, client HTTP).

La maggior parte dei benchmark pubblici **non separa** questi due effetti.
I test senza DB (Hello World, JSON) misurano solo l'effetto stateful.
I test con DB misurano la **somma di entrambi**, ma non permettono di isolare il contributo delle coroutine.

Ogni sezione qui sotto indica quale effetto predomina.

## 1. Produzione: Appwrite — Migrazione da FPM a Swoole (+91%)

> **Cosa viene misurato:** runtime stateful **+** concorrenza con coroutine.
> Appwrite e' un proxy I/O con lavoro CPU minimo. Il guadagno proviene da
> entrambi i fattori, ma isolare il contributo delle coroutine dai dati pubblici non e' possibile.

[Appwrite](https://appwrite.io/) e' un Backend-as-a-Service (BaaS) open-source
scritto in PHP. Appwrite fornisce un'API server pronta all'uso
per i task comuni delle applicazioni mobile e web:
autenticazione utenti, gestione del database,
archiviazione file, funzioni cloud, notifiche push.

Per sua natura, Appwrite e' un **puro proxy I/O**:
quasi ogni richiesta HTTP in arrivo si traduce in una o piu'
operazioni I/O (query MariaDB, chiamata Redis,
lettura/scrittura file), con un calcolo CPU proprio minimo.
Questo profilo di carico di lavoro estrae il massimo beneficio
dalla transizione alle coroutine: mentre una coroutine attende la risposta del DB,
le altre elaborano nuove richieste sullo stesso core.

Nella versione 0.7, il team ha sostituito Nginx + PHP-FPM con Swoole.

**Condizioni del test:**
500 client concorrenti, 5 minuti di carico (k6).
Tutte le richieste verso endpoint con autorizzazione e controllo abusi.

| Metrica                        | FPM (v0.6.2) | Swoole (v0.7) | Variazione      |
|--------------------------------|--------------|---------------|-----------------|
| Richieste al secondo           | 436          | 808           | **+85%**        |
| Richieste totali in 5 min      | 131.117      | 242.336       | **+85%**        |
| Tempo di risposta (normale)    | 3,77 ms      | 1,61 ms       | **−57%**        |
| Tempo di risposta (sotto carico)| 550 ms      | 297 ms        | **−46%**        |
| Tasso di successo richieste    | 98%          | 100%          | Nessun timeout  |

Miglioramento complessivo riportato dal team: **~91%** sulle metriche combinate.

**Fonte:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. Produzione: IdleMMO — 35 milioni di richieste al giorno su un singolo server

> **Cosa viene misurato:** prevalentemente **runtime stateful**.
> Laravel Octane esegue Swoole in modalita' "una richiesta — un worker",
> senza multiplexing I/O con coroutine all'interno di una richiesta.
> Il guadagno prestazionale e' dovuto al fatto che Laravel non si ricarica ad ogni richiesta.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) e'
un'applicazione PHP (Laravel Octane + Swoole), un MMORPG con 160.000+ utenti.

| Metrica                      | Valore                            |
|------------------------------|-----------------------------------|
| Richieste al giorno          | 35.000.000 (~405 req/s in media)  |
| Potenziale (stima dell'autore)| 50.000.000+ req/giorno           |
| Server                       | 1 × 32 vCPU                      |
| Worker Swoole                | 64 (4 per core)                   |
| Latenza p95 prima del tuning | 394 ms                            |
| Latenza p95 dopo Octane      | **172 ms (−56%)**                 |

L'autore nota che per applicazioni meno CPU-intensive (non un MMORPG),
lo stesso server potrebbe gestire **significativamente piu'** richieste.

**Fonte:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. Benchmark: PHP-FPM vs Swoole (BytePursuits)

> **Cosa viene misurato:** solo **runtime stateful**.
> Il test restituisce JSON senza accedere a un DB o servizi esterni.
> La concorrenza con coroutine non e' coinvolta qui — non c'e' I/O che potrebbe
> essere eseguito in parallelo. La differenza di 2,6–3x e' interamente dovuta al fatto che
> Swoole non ricrea l'applicazione ad ogni richiesta.

Benchmark indipendente sul microframework Mezzio (risposta JSON, senza DB).
Intel i7-6700T (4 core / 8 thread), 32 GB RAM, wrk, 10 secondi.

| Concorrenza | PHP-FPM (req/s) | Swoole BASE (req/s) | Differenza |
|-------------|-----------------|---------------------|------------|
| 100         | 3.472           | 9.090               | **2,6x**   |
| 500         | 3.218           | 9.159               | **2,8x**   |
| 1.000       | 3.065           | 9.205               | **3,0x**   |

Latenza media a 1000 concorrenti:
- FPM: **191 ms**
- Swoole: **106 ms**

**Punto critico:** a partire da 500 connessioni concorrenti,
PHP-FPM ha iniziato a perdere richieste (73.793 errori socket a 500, 176.652 a 700).
Swoole ha avuto **zero errori** a tutti i livelli di concorrenza.

**Fonte:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. Benchmark: con database (kenashkov)

> **Cosa viene misurato:** un insieme di test con effetti **diversi**.
> - Hello World, Autoload — puro **runtime stateful** (nessun I/O).
> - Query SQL, scenario realistico — **stateful + coroutine**.
> - Swoole utilizza un client MySQL basato su coroutine, che permette di servire
> - altre richieste mentre si attende la risposta del DB.

Una suite di test piu' realistica: Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100–1000 concorrenti, 10.000 richieste.

| Scenario                               | Apache (100 conc.) | Swoole (100 conc.) | Differenza |
|----------------------------------------|--------------------|--------------------|------------|
| Hello World                            | 25.706 req/s       | 66.309 req/s       | **2,6x**   |
| Autoload 100 classi                    | 2.074 req/s        | 53.626 req/s       | **25x**    |
| Query SQL al DB                        | 2.327 req/s        | 4.163 req/s        | **1,8x**   |
| Scenario realistico (cache + file + DB)| 141 req/s          | 286 req/s          | **2,0x**   |

A 1000 concorrenti:
- Apache **e' andato in crash** (limite connessioni, richieste fallite)
- Swoole — **zero errori** in tutti i test

**Osservazione chiave:** con I/O reale (DB + file), la differenza
scende da 25x a **1,8–2x**. Questo e' atteso:
il database diventa il collo di bottiglia comune.
Ma la stabilita' sotto carico rimane incomparabile.

**Fonte:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. Benchmark: Symfony 7 — tutti i runtime (2024)

> **Cosa viene misurato:** solo **runtime stateful**.
> Test senza DB — le coroutine non sono coinvolte.
> La differenza >10x a 1000 concorrenti si spiega con il fatto che FPM crea
> un processo per richiesta, mentre Swoole e FrankenPHP mantengono l'applicazione
> in memoria e servono le connessioni attraverso un event loop.

Test di 9 runtime PHP con Symfony 7 (k6, Docker, 1 CPU / 1 GB RAM, senza DB).

| Runtime                            | vs Nginx + PHP-FPM (a 1000 conc.) |
|------------------------------------|-------------------------------------|
| Apache + mod_php                   | ~0,5x (piu' lento)                 |
| Nginx + PHP-FPM                    | 1x (baseline)                      |
| Nginx Unit                         | ~3x                                |
| RoadRunner                         | >2x                                |
| **Swoole / FrankenPHP (worker)**   | **>10x**                           |

A 1000 connessioni concorrenti, Swoole e FrankenPHP in modalita' worker
hanno mostrato **un throughput superiore di un ordine di grandezza**
rispetto al classico Nginx + PHP-FPM.

**Fonte:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower: Swoole — primo posto tra i PHP

> **Cosa viene misurato:** **stateful + coroutine** (nei test con DB).
> TechEmpower include sia un test JSON (stateful) sia test con molteplici
> query SQL (multiple queries, Fortunes), dove l'accesso al DB basato su coroutine
> fornisce un vantaggio reale. Questo e' uno dei pochi benchmark
> dove l'effetto delle coroutine e' piu' chiaramente visibile.

In [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023), Swoole ha ottenuto il **primo posto** tra tutti i framework PHP
nel test MySQL.

TechEmpower testa scenari realistici: serializzazione JSON,
query singole al DB, query multiple, ORM, Fortunes
(templating + DB + ordinamento + escaping).

**Fonte:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf: 96.000 req/s su un framework Swoole

> **Cosa viene misurato:** **runtime stateful** (il benchmark e' Hello World).
> Hyperf e' interamente costruito sulle coroutine Swoole, e in produzione
> la concorrenza con coroutine viene utilizzata per DB, Redis e chiamate gRPC.
> Tuttavia, la cifra di 96K req/s e' stata ottenuta su Hello World senza I/O,
> il che significa che riflette l'effetto del runtime stateful.

[Hyperf](https://hyperf.dev/) e' un framework PHP basato su coroutine costruito su Swoole.
Nel benchmark (4 thread, 100 connessioni):

- **96.563 req/s**
- Latenza: 7,66 ms

Hyperf e' posizionato per i microservizi e dichiara un
vantaggio di **5–10x** rispetto ai framework PHP tradizionali.

**Fonte:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## Riepilogo: cosa mostrano i dati reali

| Tipo di test                       | FPM → Swoole                    | Effetto primario      | Nota                                          |
|------------------------------------|---------------------------------|-----------------------|-----------------------------------------------|
| Hello World / JSON                 | **2,6–3x**                      | Stateful              | BytePursuits, kenashkov                       |
| Autoload (stateful vs stateless)   | **25x**                         | Stateful              | Nessun I/O — puro effetto di conservazione stato |
| Con database                       | **1,8–2x**                      | Stateful + coroutine  | kenashkov (MySQL con coroutine)               |
| API in produzione (Appwrite)       | **+91%** (1,85x)               | Stateful + coroutine  | Proxy I/O, entrambi i fattori                 |
| Produzione (IdleMMO)               | p95: **−56%**                   | Stateful              | Worker Octane, non coroutine                  |
| Alta concorrenza (1000+)           | **Swoole stabile, FPM crasha** | Event loop            | Tutti i benchmark                             |
| Runtime Symfony (1000 conc.)       | **>10x**                        | Stateful              | Nessun DB nel test                            |
| TechEmpower (test con DB)          | **#1 tra i PHP**                | Stateful + coroutine  | Query SQL multiple                            |

## Connessione con la teoria

I risultati si allineano bene con i calcoli di [Efficienza dei task IO-bound](/it/docs/evidence/concurrency-efficiency.html):

**1. Con un database, la differenza e' piu' modesta (1,8–2x) che senza (3–10x).**
Questo conferma: con I/O reale, il collo di bottiglia diventa il DB stesso,
non il modello di concorrenza. Il coefficiente di blocco nei test con DB e' piu' basso
perche' il lavoro CPU del framework e' paragonabile al tempo di I/O.

**2. Ad alta concorrenza (500–1000+), FPM degrada mentre Swoole no.**
PHP-FPM e' limitato dal numero di worker. Ogni worker e' un processo del SO (~40 MB).
A 500+ connessioni concorrenti, FPM raggiunge il suo limite
e inizia a perdere richieste. Swoole serve migliaia di connessioni
con dozzine di coroutine senza aumentare il consumo di memoria.

**3. Il runtime stateful elimina l'overhead di re-inizializzazione.**
La differenza di 25x nel test di autoload dimostra il costo
di ricreare lo stato dell'applicazione ad ogni richiesta in FPM.
In produzione, questo si manifesta come la differenza tra T_cpu = 34 ms (FPM)
e T_cpu = 5–10 ms (stateful), che cambia drasticamente il coefficiente di blocco
e di conseguenza il guadagno dalle coroutine
(vedi [tabella in Efficienza dei task IO-bound](/it/docs/evidence/concurrency-efficiency.html)).

**4. La formula e' confermata.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1,85x).
Se T_cpu e' sceso da ~30 ms a ~15 ms (stateful)
e T_io e' rimasto ~30 ms, allora il coefficiente di blocco e' aumentato da 1,0 a 2,0,
il che predice un aumento del throughput di circa 1,5–2x. Questo corrisponde.

## Riferimenti

### Casi di produzione
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Benchmark indipendenti
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Framework e runtime
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — framework PHP basato su coroutine](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
