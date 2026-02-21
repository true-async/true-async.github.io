---
layout: docs
lang: de
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /de/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio in der Praxis: Duolingo, Super.com, Instagram, uvloop-Benchmarks, Gegenargumente."
---

# Python asyncio in der Praxis: Reale Messungen

Python ist die Sprache, die PHP in Bezug auf das Ausführungsmodell am ähnlichsten ist:
interpretiert, single-threaded (GIL), mit einer Dominanz synchroner Frameworks.
Der Übergang von synchronem Python (Flask, Django + Gunicorn) zu asynchronem
(FastAPI, aiohttp, Starlette + Uvicorn) ist eine exakte Analogie zum Übergang
von PHP-FPM zu einer Coroutine-basierten Laufzeitumgebung.

Nachfolgend eine Sammlung von Produktionsfällen, unabhängigen Benchmarks und Messungen.

---

## 1. Produktion: Duolingo — Migration zu Async Python (+40% Durchsatz)

[Duolingo](https://blog.duolingo.com/async-python-migration/) ist die größte
Sprachlernplattform (500M+ Nutzer).
Das Backend ist in Python geschrieben.

2025 begann das Team eine systematische Migration der Dienste von synchronem
Python zu async.

| Metrik                  | Ergebnis                                |
|-------------------------|-----------------------------------------|
| Durchsatz pro Instanz   | **+40%**                               |
| AWS-EC2-Kosteneinsparung | **~30%** pro migriertem Dienst         |

Die Autoren merken an, dass nach dem Aufbau der Async-Infrastruktur die Migration
einzelner Dienste sich als „ziemlich unkompliziert" herausstellte.

**Quelle:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Produktion: Super.com — 90% Kostenreduktion

[Super.com](https://www.super.com/) (ehemals Snaptravel) ist ein Hotel-Such-
und Rabattdienst. Ihre Suchmaschine verarbeitet 1.000+ req/s,
nimmt 1 TB+ Daten pro Tag auf und wickelt täglich $1M+ Umsatz ab.

**Zentrale Workload-Eigenschaft:** Jede Anfrage führt **40+ Netzwerkaufrufe**
an Drittanbieter-APIs durch. Dies ist ein reines I/O-gebundenes Profil — ein idealer Kandidat für Coroutinen.

Das Team migrierte von Flask (synchron, AWS Lambda) zu Quart (ASGI, EC2).

| Metrik                   | Flask (Lambda) | Quart (ASGI)  | Änderung       |
|--------------------------|----------------|---------------|----------------|
| Infrastrukturkosten      | ~$1.000/Tag    | ~$50/Tag      | **−90%**       |
| Durchsatz                | ~150 req/s     | 300+ req/s    | **2x**         |
| Fehler zu Spitzenzeiten  | Ausgangswert   | −95%          | **−95%**       |
| Latenz                   | Ausgangswert   | −50%          | **2x schneller** |

Einsparungen von $950/Tag × 365 = **~$350.000/Jahr** bei einem einzelnen Dienst.

**Quelle:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Produktion: Instagram — asyncio im Maßstab von 500M DAU

Instagram bedient 500+ Millionen täglich aktive Nutzer
auf einem Django-Backend.

Jimmy Lai (Instagram-Ingenieur) beschrieb die Migration zu asyncio in einem Vortrag
auf der PyCon Taiwan 2018:

- Ersetzung von `requests` durch `aiohttp` für HTTP-Aufrufe
- Migration des internen RPC zu `asyncio`
- Erreichte API-Leistungsverbesserung und reduzierte CPU-Leerlaufzeit

**Herausforderungen:** Hoher CPU-Overhead von asyncio im Instagram-Maßstab,
die Notwendigkeit einer automatisierten Erkennung blockierender Aufrufe durch
statische Code-Analyse.

**Quelle:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Produktion: Feature Store — Von Threads zu asyncio (−40% Latenz)

Der Feature-Store-Dienst migrierte von Python-Multithreading zu asyncio.

| Metrik          | Threads                     | Asyncio              | Änderung                  |
|-----------------|-----------------------------|----------------------|---------------------------|
| Latenz          | Ausgangswert                | −40%                 | **−40%**                  |
| RAM-Verbrauch   | 18 GB (Hunderte von Threads) | Deutlich weniger    | Erhebliche Reduktion      |

Die Migration wurde in drei Phasen mit 50/50-Produktions-Traffic-Aufteilung
zur Validierung durchgeführt.

**Quelle:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Produktion: Talk Python — Flask zu Quart (−81% Latenz)

[Talk Python](https://talkpython.fm/) ist einer der größten Python-Podcasts
und Lernplattformen. Der Autor (Michael Kennedy) schrieb die Seite
von Flask (synchron) zu Quart (asynchrones Flask) um.

| Metrik                  | Flask | Quart | Änderung    |
|-------------------------|-------|-------|-------------|
| Antwortzeit (Beispiel)  | 42 ms | 8 ms  | **−81%**   |
| Bugs nach Migration     | —     | 2     | Minimal     |

Der Autor merkt an: Beim Lasttest unterschieden sich die maximalen req/s
nur unwesentlich, da MongoDB-Abfragen <1 ms dauerten.
Der Gewinn zeigt sich bei **gleichzeitiger** Anfrageverarbeitung —
wenn mehrere Clients gleichzeitig auf den Server zugreifen.

**Quelle:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop als Standard

Microsoft hat [uvloop](https://github.com/MagicStack/uvloop) —
eine schnelle Event-Loop basierend auf libuv — als Standard für Azure Functions
auf Python 3.13+ integriert.

| Test                           | Standard-asyncio | uvloop      | Verbesserung |
|--------------------------------|------------------|-------------|--------------|
| 10K Anfragen, 50 VU (lokal)   | 515 req/s        | 565 req/s   | **+10%**     |
| 5 Min, 100 VU (Azure)         | 1.898 req/s      | 1.961 req/s | **+3%**      |
| 500 VU (lokal)                 | 720 req/s        | 772 req/s   | **+7%**      |

Die Standard-Event-Loop bei 500 VU zeigte **~2% Anfrageverluste**.
uvloop — null Fehler.

**Quelle:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Benchmark: I/O-gebundene Aufgaben — asyncio 130x schneller

Direkter Vergleich von Nebenläufigkeitsmodellen bei einer Aufgabe zum Herunterladen von 10.000 URLs:

| Modell       | Zeit     | Durchsatz      | Fehler    |
|--------------|----------|----------------|-----------|
| Synchron     | ~1.800 s | ~11 KB/s       | —         |
| Threads (100)| ~85 s    | ~238 KB/s      | Gering    |
| **Asyncio**  | **14 s** | **1.435 KB/s** | **0,06%** |

Asyncio: **130x schneller** als synchroner Code, **6x schneller** als Threads.

Für CPU-gebundene Aufgaben bietet asyncio keinen Vorteil
(identische Zeit, +44% Speicherverbrauch).

**Quelle:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Benchmark: uvloop — Schneller als Go und Node.js

[uvloop](https://github.com/MagicStack/uvloop) ist ein Drop-in-Ersatz für die Standard-asyncio-Event-Loop,
geschrieben in Cython auf Basis von libuv (derselben Bibliothek,
die Node.js zugrunde liegt).

TCP-Echo-Server:

| Implementierung     | 1 KiB (req/s) | 100 KiB Durchsatz  |
|---------------------|---------------|---------------------|
| **uvloop**          | **105.459**   | **2,3 GiB/s**      |
| Go                  | 103.264       | —                   |
| Standard-asyncio    | 41.420        | —                   |
| Node.js             | 44.055        | —                   |

HTTP-Server (300 gleichzeitige):

| Implementierung        | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37.866**    |
| Node.js                | Niedriger     |

uvloop: **2,5x schneller** als Standard-asyncio, **2x schneller** als Node.js,
**auf Augenhöhe mit Go**.

**Quelle:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Benchmark: aiohttp vs. requests — 10x bei gleichzeitigen Anfragen

| Bibliothek    | req/s (gleichzeitig)  | Typ   |
|---------------|------------------------|-------|
| **aiohttp**   | **241+**               | Async |
| HTTPX (async) | ~160                   | Async |
| Requests      | ~24                    | Sync  |

aiohttp: **10x schneller** als Requests bei gleichzeitigen HTTP-Anfragen.

**Quelle:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Gegenargument: Cal Paterson — „Async Python ist nicht schneller"

Es ist wichtig, auch Gegenargumente darzustellen. Cal Paterson führte einen gründlichen Benchmark
mit einer **echten Datenbank** durch (PostgreSQL, zufällige Zeilenauswahl + JSON):

| Framework                    | Typ   | req/s     | P99-Latenz  |
|------------------------------|-------|-----------|-------------|
| Gunicorn + Meinheld/Bottle   | Sync  | **5.780** | **32 ms**   |
| Gunicorn + Meinheld/Falcon   | Sync  | **5.589** | **31 ms**   |
| Uvicorn + Starlette          | Async | 4.952     | 75 ms       |
| Sanic                        | Async | 4.687     | 85 ms       |
| AIOHTTP                      | Async | 4.501     | 76 ms       |

**Ergebnis:** Synchrone Frameworks mit C-Servern zeigten **höheren Durchsatz**
und **2–3x bessere Tail-Latenz** (P99).

### Warum hat Async verloren?

Gründe:

1. **Eine einzelne SQL-Abfrage** pro HTTP-Anfrage — zu wenig I/O,
   als dass Coroutine-Nebenläufigkeit einen Effekt hätte.
2. **Kooperatives Multitasking** mit CPU-Arbeit zwischen Anfragen
   erzeugt eine „unfaire" CPU-Zeitverteilung —
   lange Berechnungen blockieren die Event-Loop für alle.
3. **asyncio-Overhead** (Standard-Event-Loop in Python)
   ist vergleichbar mit dem Gewinn durch nicht-blockierendes I/O, wenn I/O minimal ist.

### Wann Async tatsächlich hilft

Patersons Benchmark testet das **einfachste Szenario** (1 SQL-Abfrage).
Wie die obigen Produktionsfälle zeigen, bietet async einen dramatischen Gewinn, wenn:

- Es **viele** DB- / externe API-Abfragen gibt (Super.com: 40+ Aufrufe pro Anfrage)
- Die Nebenläufigkeit **hoch** ist (Tausende gleichzeitige Verbindungen)
- I/O **dominiert** über CPU (Duolingo, Appwrite)

Dies stimmt mit der Theorie überein:
Je höher der Blockierungskoeffizient (T_io/T_cpu), desto größer der Nutzen von Coroutinen.
Bei 1 SQL-Abfrage × 2 ms ist der Koeffizient zu niedrig.

**Quelle:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: Python-Frameworks

Ungefähre Ergebnisse aus [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Framework         | Typ        | req/s (JSON)           |
|-------------------|------------|------------------------|
| Uvicorn (raw)     | Async ASGI | Höchster unter Python  |
| Starlette         | Async ASGI | ~20.000–25.000         |
| FastAPI           | Async ASGI | ~15.000–22.000         |
| Flask (Gunicorn)  | Sync WSGI  | ~4.000–6.000           |
| Django (Gunicorn) | Sync WSGI  | ~2.000–4.000           |

Async-Frameworks: **3–5x** schneller als synchrone im JSON-Test.

**Quelle:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Zusammenfassung: Was die Python-Daten zeigen

| Fall                       | Sync → Async                           | Bedingung                              |
|----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (Produktion)      | **+40%** Durchsatz, **−30%** Kosten    | Microservices, I/O                     |
| Super.com (Produktion)     | **2x** Durchsatz, **−90%** Kosten      | 40+ API-Aufrufe pro Anfrage            |
| Feature Store (Produktion) | **−40%** Latenz                        | Migration von Threads zu asyncio       |
| Talk Python (Produktion)   | **−81%** Latenz                        | Flask → Quart                          |
| I/O-gebunden (10K URLs)    | **130x** schneller                     | Reines I/O, massive Nebenläufigkeit    |
| aiohttp vs. requests       | **10x** schneller                      | Gleichzeitige HTTP-Anfragen            |
| uvloop vs. Standard        | **2,5x** schneller                     | TCP-Echo, HTTP                         |
| TechEmpower JSON           | **3–5x**                               | FastAPI/Starlette vs. Flask/Django     |
| **Einfaches CRUD (1 SQL)** | **Sync ist schneller**                 | Cal Paterson: P99 2–3x schlechter für Async |
| **CPU-gebunden**           | **Kein Unterschied**                   | +44% Speicher, 0% Gewinn              |

### Zentrale Erkenntnis

Async Python bietet maximalen Nutzen bei einem **hohen Blockierungskoeffizienten**:
wenn die I/O-Zeit die CPU-Zeit deutlich übersteigt.
Bei 40+ Netzwerkaufrufen (Super.com) — 90% Kostenersparnis.
Bei 1 SQL-Abfrage (Cal Paterson) — async ist langsamer.

Dies **bestätigt die Formel** aus [Effizienz I/O-gebundener Aufgaben](/de/docs/evidence/concurrency-efficiency.html):
Gewinn ≈ 1 + T_io/T_cpu. Wenn T_io >> T_cpu — zehn- bis hundertfach.
Wenn T_io ≈ T_cpu — minimal oder null.

---

## Verbindung zu PHP und True Async

Python und PHP befinden sich in einer ähnlichen Situation:

| Eigenschaft            | Python               | PHP                 |
|------------------------|----------------------|---------------------|
| Interpretiert          | Ja                   | Ja                  |
| GIL / Single-Threaded  | GIL                  | Single-Threaded     |
| Dominantes Modell      | Sync (Django, Flask) | Sync (FPM)          |
| Async-Laufzeit         | asyncio + uvloop     | Swoole / True Async |
| Async-Framework        | FastAPI, Starlette   | Hyperf              |

Die Python-Daten zeigen, dass der Übergang zu Coroutinen in einer single-threaded
interpretierten Sprache **funktioniert**. Das Ausmaß des Gewinns
wird durch das Workload-Profil bestimmt, nicht durch die Sprache.

---

## Referenzen

### Produktionsfälle
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% Kostenreduktion](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop als Standard (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Benchmarks
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Coroutinen vs. Threads
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
