---
layout: docs
lang: de
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /de/docs/evidence/swoole-evidence.html
page_title: "Swoole in der Praxis"
description: "Swoole in der Praxis: Produktionsfälle von Appwrite und IdleMMO, unabhängige Benchmarks, TechEmpower, Vergleich mit PHP-FPM."
---

# Swoole in der Praxis: Reale Messungen

Swoole ist eine in C geschriebene PHP-Erweiterung, die eine Event-Loop, Coroutinen
und asynchrones I/O bereitstellt. Es ist die einzige ausgereifte Implementierung des Coroutine-Modells
im PHP-Ökosystem mit jahrelanger Produktionserfahrung.

Nachfolgend eine Sammlung realer Messungen: Produktionsfälle, unabhängige Benchmarks
und TechEmpower-Daten.

### Zwei Quellen des Leistungsgewinns

Der Übergang von PHP-FPM zu Swoole bietet **zwei unabhängige** Vorteile:

1. **Zustandsbehaftete Laufzeit** — die Anwendung wird einmal geladen und bleibt im Speicher.
   Der Overhead der Neuinitialisierung (Autoload, DI-Container, Konfiguration)
   bei jeder Anfrage entfällt. Dieser Effekt bringt einen Gewinn auch ohne I/O.

2. **Coroutine-Nebenläufigkeit** — während eine Coroutine auf eine DB- oder externe API-Antwort wartet,
   verarbeiten andere Anfragen auf demselben Kern. Dieser Effekt zeigt sich
   **nur wenn I/O vorhanden ist** und erfordert die Verwendung asynchroner Clients
   (Coroutine-basierter MySQL-, Redis-, HTTP-Client).

Die meisten öffentlichen Benchmarks **trennen nicht** zwischen diesen beiden Effekten.
Tests ohne DB (Hello World, JSON) messen nur den Stateful-Effekt.
Tests mit DB messen die **Summe beider**, erlauben aber keine Isolierung des Coroutine-Beitrags.

Jeder Abschnitt unten gibt an, welcher Effekt überwiegt.

## 1. Produktion: Appwrite — Migration von FPM zu Swoole (+91%)

> **Was gemessen wird:** zustandsbehaftete Laufzeit **+** Coroutine-Nebenläufigkeit.
> Appwrite ist ein I/O-Proxy mit minimaler CPU-Arbeit. Der Gewinn stammt aus
> beiden Faktoren, aber die Isolierung des Coroutine-Beitrags aus öffentlichen Daten ist nicht möglich.

[Appwrite](https://appwrite.io/) ist ein Open-Source-Backend-as-a-Service (BaaS),
geschrieben in PHP. Appwrite stellt eine fertige Server-API
für gängige Mobile- und Webanwendungsaufgaben bereit:
Benutzerauthentifizierung, Datenbankverwaltung,
Dateispeicher, Cloud-Funktionen, Push-Benachrichtigungen.

Von seiner Natur her ist Appwrite ein **reiner I/O-Proxy**:
Fast jede eingehende HTTP-Anfrage wird in eine oder mehrere
I/O-Operationen umgesetzt (MariaDB-Abfrage, Redis-Aufruf,
Datei-Lesen/Schreiben), mit minimaler eigener CPU-Berechnung.
Dieses Workload-Profil zieht maximalen Nutzen
aus dem Übergang zu Coroutinen: Während eine Coroutine auf eine DB-Antwort wartet,
verarbeiten andere neue Anfragen auf demselben Kern.

In Version 0.7 ersetzte das Team Nginx + PHP-FPM durch Swoole.

**Testbedingungen:**
500 gleichzeitige Clients, 5 Minuten Last (k6).
Alle Anfragen an Endpunkte mit Autorisierung und Missbrauchskontrolle.

| Metrik                       | FPM (v0.6.2) | Swoole (v0.7) | Änderung        |
|------------------------------|--------------|---------------|-----------------|
| Anfragen pro Sekunde         | 436          | 808           | **+85%**        |
| Gesamtanfragen in 5 Min     | 131.117      | 242.336       | **+85%**        |
| Antwortzeit (normal)         | 3,77 ms      | 1,61 ms       | **−57%**        |
| Antwortzeit (unter Last)     | 550 ms       | 297 ms        | **−46%**        |
| Anfrage-Erfolgsrate          | 98%          | 100%          | Keine Timeouts  |

Gesamtverbesserung laut Team: **~91%** über kombinierte Metriken.

**Quelle:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. Produktion: IdleMMO — 35 Millionen Anfragen pro Tag auf einem einzigen Server

> **Was gemessen wird:** überwiegend **zustandsbehaftete Laufzeit**.
> Laravel Octane führt Swoole im Modus „eine Anfrage — ein Worker" aus,
> ohne Coroutine-I/O-Multiplexing innerhalb einer Anfrage.
> Der Leistungsgewinn entsteht dadurch, dass Laravel nicht bei jeder Anfrage neu geladen wird.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) ist
eine PHP-Anwendung (Laravel Octane + Swoole), ein MMORPG mit 160.000+ Nutzern.

| Metrik                     | Wert                              |
|----------------------------|-----------------------------------|
| Anfragen pro Tag           | 35.000.000 (~405 req/s im Schnitt)|
| Potenzial (Autoreneinschätzung) | 50.000.000+ req/Tag          |
| Server                     | 1 × 32 vCPU                      |
| Swoole-Worker              | 64 (4 pro Kern)                   |
| p95-Latenz vor Tuning      | 394 ms                            |
| p95-Latenz nach Octane     | **172 ms (−56%)**                 |

Der Autor merkt an, dass für weniger CPU-intensive Anwendungen (kein MMORPG)
derselbe Server **deutlich mehr** Anfragen verarbeiten könnte.

**Quelle:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. Benchmark: PHP-FPM vs. Swoole (BytePursuits)

> **Was gemessen wird:** nur **zustandsbehaftete Laufzeit**.
> Der Test gibt JSON zurück, ohne auf eine DB oder externe Dienste zuzugreifen.
> Coroutine-Nebenläufigkeit ist hier nicht beteiligt — es gibt kein I/O, das
> parallel ausgeführt werden könnte. Der 2,6–3x-Unterschied ist vollständig darauf zurückzuführen,
> dass Swoole die Anwendung nicht bei jeder Anfrage neu erstellt.

Unabhängiger Benchmark auf dem Mezzio-Microframework (JSON-Antwort, ohne DB).
Intel i7-6700T (4 Kerne / 8 Threads), 32 GB RAM, wrk, 10 Sekunden.

| Nebenläufigkeit | PHP-FPM (req/s) | Swoole BASE (req/s) | Unterschied |
|-----------------|-----------------|---------------------|-------------|
| 100             | 3.472           | 9.090               | **2,6x**    |
| 500             | 3.218           | 9.159               | **2,8x**    |
| 1.000           | 3.065           | 9.205               | **3,0x**    |

Durchschnittliche Latenz bei 1000 gleichzeitigen:
- FPM: **191 ms**
- Swoole: **106 ms**

**Kritischer Punkt:** Ab 500 gleichzeitigen Verbindungen
begann PHP-FPM Anfragen zu verlieren (73.793 Socket-Fehler bei 500, 176.652 bei 700).
Swoole hatte **null Fehler** bei allen Nebenläufigkeitsstufen.

**Quelle:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. Benchmark: Mit Datenbank (kenashkov)

> **Was gemessen wird:** eine Reihe von Tests mit **unterschiedlichen** Effekten.
> - Hello World, Autoload — reine **zustandsbehaftete Laufzeit** (kein I/O).
> - SQL-Abfrage, reales Szenario — **Stateful + Coroutinen**.
> - Swoole verwendet einen Coroutine-basierten MySQL-Client, der es ermöglicht,
> - andere Anfragen zu bedienen, während auf eine DB-Antwort gewartet wird.

Eine realistischere Testsuite: Swoole 4.4.10 vs. Apache + mod_php.
ApacheBench, 100–1000 gleichzeitige, 10.000 Anfragen.

| Szenario                              | Apache (100 gleichz.) | Swoole (100 gleichz.) | Unterschied |
|---------------------------------------|-----------------------|-----------------------|-------------|
| Hello World                           | 25.706 req/s          | 66.309 req/s          | **2,6x**    |
| Autoload 100 Klassen                  | 2.074 req/s           | 53.626 req/s          | **25x**     |
| SQL-Abfrage an DB                     | 2.327 req/s           | 4.163 req/s           | **1,8x**    |
| Reales Szenario (Cache + Dateien + DB)| 141 req/s             | 286 req/s             | **2,0x**    |

Bei 1000 gleichzeitigen:
- Apache **stürzte ab** (Verbindungslimit, fehlgeschlagene Anfragen)
- Swoole — **null Fehler** in allen Tests

**Zentrale Beobachtung:** Mit echtem I/O (DB + Dateien) sinkt der Unterschied
von 25x auf **1,8–2x**. Das ist zu erwarten:
Die Datenbank wird zum gemeinsamen Engpass.
Aber die Stabilität unter Last bleibt unvergleichbar.

**Quelle:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. Benchmark: Symfony 7 — Alle Laufzeiten (2024)

> **Was gemessen wird:** nur **zustandsbehaftete Laufzeit**.
> Test ohne DB — Coroutinen sind nicht beteiligt.
> Der >10x-Unterschied bei 1000 gleichzeitigen erklärt sich dadurch, dass FPM
> einen Prozess pro Anfrage erstellt, während Swoole und FrankenPHP die Anwendung
> im Speicher halten und Verbindungen über eine Event-Loop bedienen.

Test von 9 PHP-Laufzeiten mit Symfony 7 (k6, Docker, 1 CPU / 1 GB RAM, ohne DB).

| Laufzeit                          | vs. Nginx + PHP-FPM (bei 1000 gleichz.) |
|-----------------------------------|------------------------------------------|
| Apache + mod_php                  | ~0,5x (langsamer)                        |
| Nginx + PHP-FPM                   | 1x (Ausgangswert)                        |
| Nginx Unit                        | ~3x                                      |
| RoadRunner                        | >2x                                      |
| **Swoole / FrankenPHP (Worker)**  | **>10x**                                 |

Bei 1000 gleichzeitigen Verbindungen zeigten Swoole und FrankenPHP im Worker-Modus
**eine Größenordnung höheren Durchsatz**
als klassisches Nginx + PHP-FPM.

**Quelle:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower: Swoole — Erster Platz unter PHP

> **Was gemessen wird:** **Stateful + Coroutinen** (in DB-Tests).
> TechEmpower umfasst sowohl einen JSON-Test (Stateful) als auch Tests mit mehreren
> SQL-Abfragen (Multiple Queries, Fortunes), bei denen Coroutine-basierter DB-Zugriff
> einen echten Vorteil bietet. Dies ist einer der wenigen Benchmarks,
> in denen der Coroutine-Effekt am deutlichsten sichtbar ist.

In den [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Runde 22, 2023) belegte Swoole den **ersten Platz** unter allen PHP-Frameworks
im MySQL-Test.

TechEmpower testet reale Szenarien: JSON-Serialisierung,
einzelne DB-Abfragen, mehrere Abfragen, ORM, Fortunes
(Templating + DB + Sortierung + Escaping).

**Quelle:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf: 96.000 req/s auf einem Swoole-Framework

> **Was gemessen wird:** **zustandsbehaftete Laufzeit** (Benchmark ist Hello World).
> Hyperf ist vollständig auf Swoole-Coroutinen aufgebaut, und in der Produktion
> wird Coroutine-Nebenläufigkeit für DB-, Redis- und gRPC-Aufrufe genutzt.
> Die Zahl von 96K req/s wurde jedoch mit Hello World ohne I/O ermittelt,
> d.h. sie spiegelt den Stateful-Laufzeit-Effekt wider.

[Hyperf](https://hyperf.dev/) ist ein Coroutine-basiertes PHP-Framework, das auf Swoole aufbaut.
Im Benchmark (4 Threads, 100 Verbindungen):

- **96.563 req/s**
- Latenz: 7,66 ms

Hyperf positioniert sich für Microservices und beansprucht
einen **5–10x**-Vorteil gegenüber traditionellen PHP-Frameworks.

**Quelle:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## Zusammenfassung: Was die realen Daten zeigen

| Testtyp                          | FPM → Swoole                    | Primärer Effekt     | Hinweis                                       |
|----------------------------------|---------------------------------|---------------------|-----------------------------------------------|
| Hello World / JSON               | **2,6–3x**                      | Stateful            | BytePursuits, kenashkov                       |
| Autoload (Stateful vs. Stateless)| **25x**                         | Stateful            | Kein I/O — reiner Effekt der Zustandserhaltung|
| Mit Datenbank                    | **1,8–2x**                      | Stateful + Coroutinen | kenashkov (Coroutine MySQL)                 |
| Produktions-API (Appwrite)       | **+91%** (1,85x)                | Stateful + Coroutinen | I/O-Proxy, beide Faktoren                   |
| Produktion (IdleMMO)             | p95: **−56%**                   | Stateful            | Octane-Worker, keine Coroutinen               |
| Hohe Nebenläufigkeit (1000+)     | **Swoole stabil, FPM stürzt ab** | Event-Loop         | Alle Benchmarks                               |
| Symfony-Laufzeiten (1000 gleichz.)| **>10x**                       | Stateful            | Kein DB im Test                               |
| TechEmpower (DB-Tests)           | **#1 unter PHP**                | Stateful + Coroutinen | Mehrere SQL-Abfragen                        |

## Verbindung zur Theorie

Die Ergebnisse stimmen gut mit den Berechnungen aus [Effizienz I/O-gebundener Aufgaben](/de/docs/evidence/concurrency-efficiency.html) überein:

**1. Mit Datenbank ist der Unterschied bescheidener (1,8–2x) als ohne (3–10x).**
Dies bestätigt: Bei echtem I/O wird die DB selbst zum Engpass,
nicht das Nebenläufigkeitsmodell. Der Blockierungskoeffizient in DB-Tests ist niedriger,
weil die CPU-Arbeit des Frameworks vergleichbar mit der I/O-Zeit ist.

**2. Bei hoher Nebenläufigkeit (500–1000+) degradiert FPM, während Swoole es nicht tut.**
PHP-FPM ist durch die Anzahl der Worker begrenzt. Jeder Worker ist ein OS-Prozess (~40 MB).
Bei 500+ gleichzeitigen Verbindungen erreicht FPM sein Limit
und beginnt Anfragen zu verlieren. Swoole bedient Tausende von Verbindungen
in Dutzenden von Coroutinen ohne Erhöhung des Speicherverbrauchs.

**3. Zustandsbehaftete Laufzeit eliminiert den Neuinitialisierungs-Overhead.**
Der 25x-Unterschied im Autoload-Test demonstriert die Kosten
der Neuerstellung des Anwendungszustands bei jeder Anfrage in FPM.
In der Produktion zeigt sich dies als Unterschied zwischen T_cpu = 34 ms (FPM)
und T_cpu = 5–10 ms (Stateful), was den Blockierungskoeffizienten
und folglich den Gewinn durch Coroutinen dramatisch verändert
(siehe [Tabelle in Effizienz I/O-gebundener Aufgaben](/de/docs/evidence/concurrency-efficiency.html)).

**4. Die Formel wird bestätigt.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1,85x).
Wenn T_cpu von ~30 ms auf ~15 ms sank (Stateful)
und T_io bei ~30 ms blieb, dann stieg der Blockierungskoeffizient von 1,0 auf 2,0,
was eine Durchsatzsteigerung von ungefähr 1,5–2x vorhersagt. Das passt.

## Referenzen

### Produktionsfälle
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Unabhängige Benchmarks
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Frameworks und Laufzeiten
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — Coroutine-basiertes PHP-Framework](https://github.com/hyperf/hyperf)
- [OpenSwoole Benchmark](https://openswoole.com/benchmark)
- [Swoole-Quellcode (GitHub)](https://github.com/swoole/swoole-src)
