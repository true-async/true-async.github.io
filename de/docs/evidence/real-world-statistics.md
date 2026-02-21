---
layout: docs
lang: de
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /de/docs/evidence/real-world-statistics.html
page_title: "Nebenläufigkeitsstatistiken"
description: "Reale statistische Daten zur Nebenläufigkeitsberechnung: SQL-Abfragen, DB-Latenzen, PHP-Framework-Durchsatz."
---

# Statistische Daten zur Nebenläufigkeitsberechnung

Die Formeln aus dem Abschnitt [Effizienz I/O-gebundener Aufgaben](/de/docs/evidence/concurrency-efficiency.html) arbeiten mit
mehreren Schlüsselgrößen. Nachfolgend eine Sammlung realer Messungen,
die es ermöglichen, konkrete Zahlen in die Formeln einzusetzen.

---

## Formelelemente

Little's Law:

$$
L = \lambda \cdot W
$$

- `L` — das erforderliche Nebenläufigkeitsniveau (wie viele Tasks gleichzeitig)
- `λ` — Durchsatz (Anfragen pro Sekunde)
- `W` — durchschnittliche Verarbeitungszeit einer Anfrage

Goetz-Formel:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — I/O-Wartezeit pro Anfrage
- `T_cpu` — CPU-Berechnungszeit pro Anfrage

Für die praktische Berechnung müssen Sie wissen:

1. **Wie viele SQL-Abfragen pro HTTP-Anfrage ausgeführt werden**
2. **Wie lange eine SQL-Abfrage dauert (I/O)**
3. **Wie lange die CPU-Verarbeitung dauert**
4. **Wie hoch der Server-Durchsatz ist**
5. **Wie lang die Gesamtantwortzeit ist**

---

## 1. SQL-Abfragen pro HTTP-Anfrage

Die Anzahl der Datenbankaufrufe hängt vom Framework, ORM und der Seitenkomplexität ab.

| Anwendung / Framework              | Abfragen pro Seite     | Quelle                                                                                                           |
|-------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (ohne Plugins)            | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, durchschnittl.)  | <30 (Profiler-Schwelle) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                       |
| Laravel (einfaches CRUD)            | 5–15                   | Typische Werte aus Laravel Debugbar                                                                              |
| Laravel (mit N+1-Problem)           | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (ohne Cache)                 | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (Katalog)                   | 50–200+                | Typisch für komplexen E-Commerce                                                                                 |

**Median für eine typische ORM-Anwendung: 15–30 Abfragen pro HTTP-Anfrage.**

Symfony verwendet einen Schwellenwert von 30 Abfragen als „normale" Grenze — bei Überschreitung
wird das Profiler-Symbol gelb.

## 2. Zeit pro SQL-Abfrage (T_io pro Abfrage)

### Abfrageausführungszeit auf dem DB-Server

Daten aus Perconas sysbench-OLTP-Benchmarks (MySQL):

| Nebenläufigkeit | Anteil Abfragen <0,1 ms | 0,1–1 ms | 1–10 ms | >10 ms |
|-----------------|--------------------------|----------|---------|--------|
| 1 Thread        | 86%                      | 10%      | 3%      | 1%     |
| 32 Threads      | 68%                      | 30%      | 2%      | <1%    |
| 128 Threads     | 52%                      | 35%      | 12%     | 1%     |

LinkBench (Percona, Annäherung an realen Facebook-Workload):

| Operation     | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0,4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0,7 ms | 47 ms | 100 ms |

**Quelle:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Netzwerklatenz (Round-Trip)

| Szenario                 | Round-Trip | Quelle |
|--------------------------|------------|--------|
| Unix-Socket / localhost  | <0,1 ms   | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, einzelnes Rechenzentrum | ~0,5 ms | CYBERTEC PostgreSQL |
| Cloud, Cross-AZ          | 1–5 ms   | CYBERTEC PostgreSQL |
| Cross-Region              | 10–50 ms | Typische Werte |

### Gesamt: Vollständige Zeit pro SQL-Abfrage

Gesamtzeit = serverseitige Ausführungszeit + Netzwerk-Round-Trip.

| Umgebung           | Einfaches SELECT (p50) | Durchschnittliche Abfrage (p50) |
|--------------------|------------------------|----------------------------------|
| Localhost          | 0,1–0,5 ms            | 0,5–2 ms                        |
| LAN (einzelnes RZ) | 0,5–1,5 ms           | 1–4 ms                          |
| Cloud (Cross-AZ)   | 2–6 ms               | 3–10 ms                         |

Für eine Cloud-Umgebung sind **4 ms pro durchschnittliche Abfrage** eine fundierte Schätzung.

## 3. CPU-Zeit pro SQL-Abfrage (T_cpu pro Abfrage)

Die CPU-Zeit umfasst: Ergebnis-Parsing, ORM-Entity-Hydration,
Objekt-Mapping, Serialisierung.

Direkte Benchmarks dieses spezifischen Werts sind in öffentlichen Quellen selten,
können aber aus Profiler-Daten geschätzt werden:

- Blackfire.io trennt die Wall-Time in **I/O-Zeit** und **CPU-Zeit**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- In typischen PHP-Anwendungen ist die Datenbank der Haupt-Engpass,
  und die CPU-Zeit macht einen geringen Anteil der Wall-Time aus
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Indirekte Schätzung über den Durchsatz:**

Symfony mit Doctrine (DB + Twig-Rendering) verarbeitet ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
Das bedeutet CPU-Zeit pro Anfrage ≈ 1 ms.
Bei ~20 SQL-Abfragen pro Seite → **~0,05 ms CPU pro SQL-Abfrage**.

Laravel-API-Endpunkt (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
CPU-Zeit pro Anfrage ≈ 2,3 ms. Bei ~15 Abfragen → **~0,15 ms CPU pro SQL-Abfrage**.

## 4. Durchsatz (λ) von PHP-Anwendungen

Benchmarks auf 30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15 gleichzeitige Verbindungen ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Anwendung | Seitentyp              | req/s (PHP 8.4) |
|-----------|------------------------|-----------------|
| Laravel   | Welcome (ohne DB)      | ~700            |
| Laravel   | API + Eloquent + Auth  | ~440            |
| Symfony   | Doctrine + Twig        | ~1.000          |
| WordPress | Homepage (ohne Plugins)| ~148            |
| Drupal 10 | —                      | ~1.400          |

Beachten Sie, dass WordPress deutlich langsamer ist,
weil jede Anfrage aufwendiger ist (mehr SQL-Abfragen, komplexeres Rendering).

---

## 5. Gesamtantwortzeit (W) in der Produktion

Daten von LittleData (2023, 2.800 E-Commerce-Sites):

| Plattform               | Durchschnittliche Server-Antwortzeit |
|-------------------------|--------------------------------------|
| Shopify                 | 380 ms                               |
| E-Commerce-Durchschnitt | 450 ms                               |
| WooCommerce (WordPress) | 780 ms                               |
| Magento                 | 820 ms                               |

**Quelle:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Branchenbenchmarks:

| Kategorie              | API-Antwortzeit |
|------------------------|-----------------|
| Ausgezeichnet          | 100–300 ms      |
| Akzeptabel             | 300–600 ms      |
| Optimierung nötig      | >600 ms         |

## Praktische Berechnung mit Little's Law

### Szenario 1: Laravel-API in der Cloud

**Eingabedaten:**
- λ = 440 req/s (Zieldurchsatz)
- W = 80 ms (berechnet: 20 SQL × 4 ms I/O + 1 ms CPU)
- Kerne: 8

**Berechnung:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ gleichzeitige Tasks}
$$

Auf 8 Kernen sind das ~4,4 Tasks pro Kern. Dies passt dazu, dass Laravel mit 15 gleichzeitigen
PHP-FPM-Workern bereits 440 req/s erreicht. Es gibt noch Spielraum.

### Szenario 2: Laravel-API in der Cloud, 2000 req/s (Ziel)

**Eingabedaten:**
- λ = 2000 req/s (Zieldurchsatz)
- W = 80 ms
- Kerne: 8

**Berechnung:**

$$
L = 2000 \times 0.080 = 160 \text{ gleichzeitige Tasks}
$$

PHP-FPM kann 160 Worker auf 8 Kernen nicht bewältigen — jeder Worker ist ein separater Prozess
mit ~30–50 MB Speicher. Gesamt: ~6–8 GB allein für Worker.

Mit Coroutinen: 160 Tasks × ~4 KiB ≈ **640 KiB**. Ein Unterschied von **vier Größenordnungen**.

### Szenario 3: Verwendung der Goetz-Formel

**Eingabedaten:**
- T_io = 80 ms (20 Abfragen × 4 ms)
- T_cpu = 1 ms
- Kerne: 8

**Berechnung:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ Coroutinen}
$$

**Durchsatz** (über Little's Law):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

Das ist die theoretische Obergrenze bei voller Auslastung von 8 Kernen.
In der Praxis wird es aufgrund von Scheduler-Overhead, GC und Connection-Pool-Limits niedriger liegen.
Aber selbst 50% dieses Werts (4.000 req/s) sind
**eine Größenordnung mehr** als 440 req/s von PHP-FPM auf denselben 8 Kernen.

## Zusammenfassung: Woher die Zahlen stammen

| Größe                              | Wert             | Quelle                                    |
|------------------------------------|------------------|-------------------------------------------|
| SQL-Abfragen pro HTTP-Anfrage      | 15–30            | WordPress ~17, Symfony-Schwelle <30       |
| Zeit pro SQL-Abfrage (Cloud)       | 3–6 ms           | Percona p50 + CYBERTEC Round-Trip         |
| CPU pro SQL-Abfrage                | 0,05–0,15 ms     | Rückrechnung aus Durchsatz-Benchmarks     |
| Laravel-Durchsatz                  | ~440 req/s (API) | Sevalla/Kinsta-Benchmarks, PHP 8.4        |
| E-Commerce-Antwortzeit (Durchschn.)| 450 ms           | LittleData, 2.800 Sites                  |
| API-Antwortzeit (Norm)             | 100–300 ms       | Branchenbenchmark                         |

---

## Referenzen

### PHP-Framework-Benchmarks
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — Durchsatz für WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel Welcome + API-Endpunkt

### Datenbank-Benchmarks
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 pro Operation
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — Latenzverteilung bei verschiedener Nebenläufigkeit
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — Netzwerklatenzen nach Umgebung
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — Schwellenwerte <10ms / >100ms

### Antwortzeiten von Produktionssystemen
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2.800 E-Commerce-Sites

### PHP-Profiling
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — Wall-Time-Aufschlüsselung in I/O und CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM für PHP-Anwendungen
