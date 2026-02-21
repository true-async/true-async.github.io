---
layout: docs
lang: de
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /de/docs/evidence/coroutines-evidence.html
page_title: "Warum Coroutinen funktionieren"
description: "Empirische Evidenz: Kontextwechsel-Kosten, Speichervergleich, das C10K-Problem, akademische Forschung."
---

# Empirische Evidenz: Warum Single-Threaded-Coroutinen funktionieren

Die Behauptung, dass kooperative Nebenläufigkeit in einem einzelnen Thread
für I/O-lastige Workloads effektiv ist, wird durch Messungen, akademische Forschung
und Betriebserfahrung mit großen Systemen gestützt.

---

## 1. Wechselkosten: Coroutine vs. OS-Thread

Der Hauptvorteil von Coroutinen besteht darin, dass der kooperative Wechsel
im Benutzerraum stattfindet, ohne den OS-Kernel aufzurufen.

### Messungen unter Linux

| Metrik                 | OS-Thread (Linux NPTL)                   | Coroutine / Async-Task                 |
|------------------------|------------------------------------------|----------------------------------------|
| Kontextwechsel         | 1,2–1,5 µs (gepinnt), ~2,2 µs (ungepinnt) | ~170 ns (Go), ~200 ns (Rust async)   |
| Task-Erstellung        | ~17 µs                                   | ~0,3 µs                               |
| Speicher pro Task      | ~9,5 KiB (min), 8 MiB (Standard-Stack)  | ~0,4 KiB (Rust), 2–4 KiB (Go)         |
| Skalierbarkeit         | ~80.000 Threads (Test)                   | 250.000+ Async-Tasks (Test)            |

**Quellen:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  direkte Messungen der Linux-Thread-Wechselkosten und Vergleich mit Goroutinen
- [Jim Blandy, context-switch (Rust-Benchmark)](https://github.com/jimblandy/context-switch) —
  Async-Task-Wechsel in ~0,2 µs vs. ~1,7 µs für einen Thread (**8,5x** schneller),
  erstellt in 0,3 µs vs. 17 µs (**56x** schneller), benötigt 0,4 KiB vs. 9,5 KiB (**24x** weniger)

### Was das in der Praxis bedeutet

Der Wechsel einer Coroutine kostet **~200 Nanosekunden** — eine Größenordnung günstiger
als der Wechsel eines OS-Threads (~1,5 µs).
Aber noch wichtiger ist, dass der Coroutine-Wechsel **keine indirekten Kosten verursacht**:
TLB-Cache-Flush, Branch-Predictor-Invalidierung, Migration zwischen Kernen —
all das ist typisch für Threads, aber nicht für Coroutinen innerhalb eines einzelnen Threads.

Für eine Event-Loop, die 80 Coroutinen pro Kern verarbeitet,
beträgt der gesamte Wechsel-Overhead:

```
80 × 200 ns = 16 µs für einen vollständigen Zyklus durch alle Coroutinen
```

Das ist vernachlässigbar im Vergleich zu 80 ms I/O-Wartezeit.

---

## 2. Speicher: Größenordnung der Unterschiede

OS-Threads allokieren einen Stack fester Größe (standardmäßig 8 MiB unter Linux).
Coroutinen speichern nur ihren Zustand — lokale Variablen und den Wiederaufnahmepunkt.

| Implementierung                | Speicher pro Nebenläufigkeitseinheit                      |
|--------------------------------|-----------------------------------------------------------|
| Linux-Thread (Standard-Stack)  | 8 MiB virtuell, ~10 KiB RSS Minimum                      |
| Go-Goroutine                   | 2–4 KiB (dynamischer Stack, wächst bei Bedarf)            |
| Kotlin-Coroutine               | wenige Bytes auf dem Heap; Thread:Coroutine-Verhältnis ≈ 6:1 |
| Rust-Async-Task                | ~0,4 KiB                                                  |
| C++-Coroutine-Frame (Pigweed)  | 88–408 Bytes                                              |
| Python-asyncio-Coroutine       | ~2 KiB (vs. ~5 KiB + 32 KiB Stack für einen Thread)      |

**Quellen:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — 6:1 Speicherverhältnis
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — Vergleich in Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — dynamischer Goroutine-Stack

### Auswirkungen auf Webserver

Für 640 gleichzeitige Tasks (8 Kerne × 80 Coroutinen):

- **OS-Threads**: 640 × 8 MiB = 5 GiB virtueller Speicher
  (tatsächlich weniger durch Lazy Allocation, aber der Druck auf den OS-Scheduler ist erheblich)
- **Coroutinen**: 640 × 4 KiB = 2,5 MiB
  (ein Unterschied von **drei Größenordnungen**)

---

## 3. Das C10K-Problem und reale Server

### Das Problem

1999 formulierte Dan Kegel das
[C10K-Problem](https://www.kegel.com/c10k.html):
Server mit dem Modell „ein Thread pro Verbindung" konnten
10.000 gleichzeitige Verbindungen nicht bedienen.
Die Ursache waren nicht Hardware-Beschränkungen, sondern der Overhead von OS-Threads.

### Die Lösung

Das Problem wurde durch den Übergang zu einer ereignisgesteuerten Architektur gelöst:
Statt für jede Verbindung einen Thread zu erstellen,
bedient eine einzelne Event-Loop Tausende von Verbindungen in einem Thread.

Genau dieser Ansatz wird von **nginx**, **Node.js**, **libuv** und — im PHP-Kontext — **True Async** umgesetzt.

### Benchmarks: nginx (ereignisgesteuert) vs. Apache (Thread-pro-Anfrage)

| Metrik (1000 gleichzeitige Verbindungen) | nginx        | Apache                           |
|------------------------------------------|--------------|----------------------------------|
| Anfragen pro Sekunde (statisch)          | 2.500–3.000  | 800–1.200                        |
| HTTP/2-Durchsatz                         | >6.000 req/s | ~826 req/s                       |
| Stabilität unter Last                    | Stabil       | Degradierung bei >150 Verbindungen |

nginx bedient **2–4x** mehr Anfragen als Apache
und verbraucht dabei deutlich weniger Speicher.
Apache mit Thread-pro-Anfrage-Architektur akzeptiert nicht mehr als 150 gleichzeitige Verbindungen
(standardmäßig), danach warten neue Clients in einer Warteschlange.

**Quellen:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — Problemstellung
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — Benchmarks
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — Industrieerfahrung

---

## 4. Akademische Forschung

### SEDA: Staged Event-Driven Architecture (Welsh et al., 2001)

Matt Welsh, David Culler und Eric Brewer von der UC Berkeley schlugen
SEDA vor — eine Serverarchitektur basierend auf Ereignissen und Warteschlangen zwischen Verarbeitungsstufen.

**Kernergebnis**: Der SEDA-Server in Java übertraf
Apache (C, Thread-pro-Verbindung) im Durchsatz bei 10.000+ gleichzeitigen Verbindungen.
Apache konnte nicht mehr als 150 gleichzeitige Verbindungen akzeptieren.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Vergleich von Webserver-Architekturen (Pariag et al., 2007)

Der gründlichste Vergleich von Architekturen wurde von Pariag et al.
an der University of Waterloo durchgeführt. Sie verglichen drei Server auf derselben Codebasis:

- **µserver** — ereignisgesteuert (SYMPED, einzelner Prozess)
- **Knot** — Thread-pro-Verbindung (Capriccio-Bibliothek)
- **WatPipe** — hybrid (Pipeline, ähnlich wie SEDA)

**Kernergebnis**: Der ereignisgesteuerte µserver und der Pipeline-basierte WatPipe
lieferten **~18% höheren Durchsatz** als der Thread-basierte Knot.
WatPipe benötigte 25 Writer-Threads, um die gleiche Leistung
wie µserver mit 10 Prozessen zu erreichen.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: Beschleunigte Ereignisverarbeitung mit Coroutinen (2022)

Eine auf arXiv veröffentlichte Studie führte einen direkten Vergleich
von Coroutinen und Threads für die Verarbeitung von Streamdaten (ereignisbasierte Verarbeitung) durch.

**Kernergebnis**: Coroutinen lieferten **mindestens 2x Durchsatz**
im Vergleich zu herkömmlichen Threads für die Verarbeitung von Ereignisströmen.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Skalierbarkeit: 100.000 Tasks

### Kotlin: 100.000 Coroutinen in 100 ms

Im [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)-Benchmark
dauerte das Erstellen und Starten von 100.000 Coroutinen ~100 ms Overhead.
Eine äquivalente Anzahl von Threads würde ~1,7 Sekunden allein für die Erstellung
(100.000 × 17 µs) und ~950 MiB Speicher für Stacks benötigen.

### Rust: 250.000 Async-Tasks

Im [context-switch-Benchmark](https://github.com/jimblandy/context-switch)
wurden 250.000 Async-Tasks in einem einzelnen Prozess gestartet,
während OS-Threads ihr Limit bei ~80.000 erreichten.

### Go: Millionen von Goroutinen

Go startet routinemäßig Hunderttausende und Millionen von Goroutinen in Produktionssystemen.
Dies ermöglicht es Servern wie Caddy, Traefik und CockroachDB,
Zehntausende gleichzeitige Verbindungen zu verarbeiten.

---

## 6. Zusammenfassung der Evidenz

| Behauptung                                             | Bestätigung                                               |
|--------------------------------------------------------|-----------------------------------------------------------|
| Coroutine-Wechsel ist günstiger als Threads            | ~200 ns vs. ~1500 ns — **7–8x** (Bendersky 2018, Blandy) |
| Coroutinen verbrauchen weniger Speicher                | 0,4–4 KiB vs. 9,5 KiB–8 MiB — **24x+** (Blandy, Go FAQ) |
| Ereignisgesteuerter Server skaliert besser             | nginx 2–4x Durchsatz vs. Apache (Benchmarks)             |
| Ereignisgesteuert > Thread-pro-Verbindung (akademisch) | +18% Durchsatz (Pariag 2007), C10K gelöst (Kegel 1999)   |
| Coroutinen > Threads für Ereignisverarbeitung          | 2x Durchsatz (AEStream 2022)                             |
| Hunderttausende Coroutinen in einem Prozess            | 250K Async-Tasks (Rust), 100K Coroutinen in 100ms (Kotlin)|
| Formel N ≈ 1 + T_io/T_cpu ist korrekt                 | Goetz 2006, Zalando, Little's Law                         |

---

## Referenzen

### Messungen und Benchmarks
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Akademische Arbeiten
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Industrieerfahrung
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### Siehe auch
- [Python asyncio in der Praxis](/de/docs/evidence/python-evidence.html) — Produktionsfälle (Duolingo, Super.com, Instagram), uvloop-Benchmarks, Cal Patersons Gegenargumente
- [Swoole in der Praxis](/de/docs/evidence/swoole-evidence.html) — Produktionsfälle und Benchmarks für PHP-Coroutinen
