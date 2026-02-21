---
layout: docs
lang: it
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /it/docs/evidence/real-world-statistics.html
page_title: "Statistiche sulla concorrenza"
description: "Dati statistici reali per il calcolo della concorrenza: query SQL, latenze del DB, throughput dei framework PHP."
---

# Dati statistici per il calcolo della concorrenza

Le formule della sezione [Efficienza dei task IO-bound](/it/docs/evidence/concurrency-efficiency.html) operano su
diverse grandezze chiave. Di seguito una raccolta di misurazioni reali
che permettono di inserire numeri concreti nelle formule.

---

## Elementi delle formule

Legge di Little:

$$
L = \lambda \cdot W
$$

- `L` — il livello di concorrenza richiesto (quanti task contemporaneamente)
- `λ` — throughput (richieste al secondo)
- `W` — tempo medio di elaborazione di una richiesta

Formula di Goetz:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — tempo di attesa I/O per richiesta
- `T_cpu` — tempo di calcolo CPU per richiesta

Per il calcolo pratico, e' necessario conoscere:

1. **Quante query SQL vengono eseguite per richiesta HTTP**
2. **Quanto tempo impiega una query SQL (I/O)**
3. **Quanto tempo richiede l'elaborazione CPU**
4. **Qual e' il throughput del server**
5. **Qual e' il tempo di risposta complessivo**

---

## 1. Query SQL per richiesta HTTP

Il numero di chiamate al database dipende dal framework, dall'ORM e dalla complessita' della pagina.

| Applicazione / Framework          | Query per pagina       | Fonte                                                                                                            |
|------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (senza plugin)           | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, pagina media)   | <30 (soglia profiler)  | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                         |
| Laravel (CRUD semplice)            | 5–15                   | Valori tipici da Laravel Debugbar                                                                                |
| Laravel (con problema N+1)         | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (senza cache)               | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (catalogo)                 | 50–200+                | Tipico per e-commerce complesso                                                                                  |

**Mediana per una tipica applicazione ORM: 15–30 query per richiesta HTTP.**

Symfony utilizza una soglia di 30 query come limite "normale" — superata la quale,
l'icona del profiler diventa gialla.

## 2. Tempo per query SQL (T_io per query)

### Tempo di esecuzione della query sul server DB

Dati dai benchmark sysbench OLTP di Percona (MySQL):

| Concorrenza    | Quota di query <0,1 ms | 0,1–1 ms | 1–10 ms | >10 ms |
|----------------|------------------------|----------|---------|--------|
| 1 thread       | 86%                    | 10%      | 3%      | 1%     |
| 32 thread      | 68%                    | 30%      | 2%      | <1%    |
| 128 thread     | 52%                    | 35%      | 12%     | 1%     |

LinkBench (Percona, approssimazione del carico reale di Facebook):

| Operazione    | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0,4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0,7 ms | 47 ms | 100 ms |

**Fonte:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Latenza di rete (round-trip)

| Scenario                 | Round-trip | Fonte |
|--------------------------|------------|-------|
| Unix-socket / localhost  | <0,1 ms   | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, singolo data center | ~0,5 ms   | CYBERTEC PostgreSQL |
| Cloud, cross-AZ          | 1–5 ms    | CYBERTEC PostgreSQL |
| Cross-region              | 10–50 ms  | Valori tipici |

### Totale: tempo completo per query SQL

Tempo completo = tempo di esecuzione lato server + round-trip di rete.

| Ambiente          | SELECT semplice (p50) | Query media (p50) |
|-------------------|----------------------|-------------------|
| Localhost         | 0,1–0,5 ms          | 0,5–2 ms          |
| LAN (singolo DC)  | 0,5–1,5 ms          | 1–4 ms            |
| Cloud (cross-AZ)  | 2–6 ms              | 3–10 ms           |

Per un ambiente cloud, **4 ms per query media** e' una stima ben fondata.

## 3. Tempo CPU per query SQL (T_cpu per query)

Il tempo CPU copre: parsing del risultato, hydration delle entita' ORM,
mapping degli oggetti, serializzazione.

Benchmark diretti di questo specifico valore sono scarsi nelle fonti pubbliche,
ma possono essere stimati dai dati del profiler:

- Blackfire.io separa il wall time in **tempo I/O** e **tempo CPU**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- Nelle tipiche applicazioni PHP, il database e' il collo di bottiglia principale,
  e il tempo CPU costituisce una piccola frazione del wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Stima indiretta tramite throughput:**

Symfony con Doctrine (DB + rendering Twig) elabora ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Questo significa tempo CPU per richiesta ≈ 1 ms.
Con ~20 query SQL per pagina → **~0,05 ms CPU per query SQL**.

Endpoint API Laravel (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
Tempo CPU per richiesta ≈ 2,3 ms. Con ~15 query → **~0,15 ms CPU per query SQL**.

## 4. Throughput (λ) delle applicazioni PHP

Benchmark eseguiti su 30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15 connessioni concorrenti ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Applicazione | Tipo di pagina           | req/s (PHP 8.4) |
|--------------|--------------------------|-----------------|
| Laravel      | Welcome (senza DB)       | ~700            |
| Laravel      | API + Eloquent + Auth    | ~440            |
| Symfony      | Doctrine + Twig          | ~1.000          |
| WordPress    | Homepage (senza plugin)  | ~148            |
| Drupal 10    | —                        | ~1.400          |

Da notare che WordPress e' significativamente piu' lento
perche' ogni richiesta e' piu' pesante (piu' query SQL, rendering piu' complesso).

---

## 5. Tempo di risposta complessivo (W) in produzione

Dati da LittleData (2023, 2.800 siti e-commerce):

| Piattaforma             | Tempo medio di risposta del server |
|-------------------------|------------------------------------|
| Shopify                 | 380 ms                             |
| Media e-commerce        | 450 ms                             |
| WooCommerce (WordPress) | 780 ms                             |
| Magento                 | 820 ms                             |

**Fonte:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Benchmark industriali:

| Categoria             | Tempo di risposta API |
|-----------------------|-----------------------|
| Eccellente            | 100–300 ms            |
| Accettabile           | 300–600 ms            |
| Necessita ottimizzazione | >600 ms            |

## Calcolo pratico con la Legge di Little

### Scenario 1: API Laravel nel cloud

**Dati di input:**
- λ = 440 req/s (throughput target)
- W = 80 ms (calcolato: 20 SQL × 4 ms I/O + 1 ms CPU)
- Core: 8

**Calcolo:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ task concorrenti}
$$

Su 8 core, sono ~4,4 task per core. Questo corrisponde al fatto che Laravel con 15
worker PHP-FPM concorrenti raggiunge gia' 440 req/s. C'e' margine di crescita.

### Scenario 2: API Laravel nel cloud, 2000 req/s (target)

**Dati di input:**
- λ = 2000 req/s (throughput target)
- W = 80 ms
- Core: 8

**Calcolo:**

$$
L = 2000 \times 0.080 = 160 \text{ task concorrenti}
$$

PHP-FPM non puo' gestire 160 worker su 8 core — ogni worker e' un processo separato
con ~30–50 MB di memoria. Totale: ~6–8 GB solo per i worker.

Con le coroutine: 160 task × ~4 KiB ≈ **640 KiB**. Una differenza di **quattro ordini di grandezza**.

### Scenario 3: Utilizzo della formula di Goetz

**Dati di input:**
- T_io = 80 ms (20 query × 4 ms)
- T_cpu = 1 ms
- Core: 8

**Calcolo:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ coroutine}
$$

**Throughput** (tramite la Legge di Little):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

Questo e' il tetto teorico con pieno utilizzo di 8 core.
In pratica, sara' inferiore a causa dell'overhead dello scheduler, del GC, dei limiti del pool di connessioni.
Ma anche il 50% di questo valore (4.000 req/s) e'
**un ordine di grandezza superiore** ai 440 req/s di PHP-FPM sugli stessi 8 core.

## Riepilogo: da dove provengono i numeri

| Grandezza                           | Valore           | Fonte                                     |
|-------------------------------------|------------------|-------------------------------------------|
| Query SQL per richiesta HTTP        | 15–30            | WordPress ~17, soglia Symfony <30         |
| Tempo per query SQL (cloud)         | 3–6 ms           | Percona p50 + CYBERTEC round-trip         |
| CPU per query SQL                   | 0,05–0,15 ms     | Calcolo inverso dai benchmark di throughput |
| Throughput Laravel                  | ~440 req/s (API) | Benchmark Sevalla/Kinsta, PHP 8.4         |
| Tempo di risposta e-commerce (media)| 450 ms           | LittleData, 2.800 siti                   |
| Tempo di risposta API (norma)       | 100–300 ms       | Benchmark industriale                     |

---

## Riferimenti

### Benchmark dei framework PHP
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — throughput per WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + endpoint API

### Benchmark dei database
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 per operazione
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — distribuzione della latenza a diversi livelli di concorrenza
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — latenze di rete per ambiente
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — soglie <10ms / >100ms

### Tempi di risposta dei sistemi in produzione
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2.800 siti e-commerce

### Profilazione PHP
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — scomposizione del wall time in I/O e CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM per applicazioni PHP
