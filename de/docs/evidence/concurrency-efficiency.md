---
layout: docs
lang: de
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /de/docs/evidence/concurrency-efficiency.html
page_title: "IO-Bound vs CPU-bound"
description: "Analyse der Nebenl&auml;ufigkeitseffizienz f&uuml;r IO-bound und CPU-bound Aufgaben. Littles Gesetz, Goetz-Formel, Berechnung der optimalen Anzahl von Koroutinen."
---

# IO-Bound vs CPU-bound

Wie viel Nebenl&auml;ufigkeit oder Parallelit&auml;t einen Leistungsgewinn bringt, h&auml;ngt von der Art der Arbeitslast ab.
In Serveranwendungen werden typischerweise zwei Haupttypen von Aufgaben unterschieden.

- **IO-bound** -- Aufgaben, bei denen ein erheblicher Anteil der Zeit mit dem Warten auf Ein-/Ausgabeoperationen verbracht wird:
  Netzwerkanfragen, Datenbankabfragen, Lesen und Schreiben von Dateien. In diesen Momenten ist die CPU unt&auml;tig.
- **CPU-bound** -- Aufgaben, die intensive Berechnungen erfordern und den Prozessor nahezu st&auml;ndig besch&auml;ftigen:
  komplexe Algorithmen, Datenverarbeitung, Kryptografie.

In den letzten Jahren haben sich die meisten Webanwendungen in Richtung **IO-bound**-Arbeitslasten verschoben.
Dies wird durch das Wachstum von Microservices, entfernten `API`s und Cloud-Diensten vorangetrieben.
Ans&auml;tze wie Frontend for Backend (`BFF`) und `API Gateway`, die Daten aus mehreren Quellen aggregieren,
verst&auml;rken diesen Effekt.

Eine moderne Serveranwendung ist auch schwer ohne Logging, Telemetrie
und Echtzeit-Monitoring vorstellbar. All diese Operationen sind von Natur aus IO-bound.

## Effizienz von IO-bound-Aufgaben

Die Effizienz der nebenl&auml;ufigen Ausf&uuml;hrung von `IO-bound`-Aufgaben wird davon bestimmt,
welchen Anteil der Zeit die Aufgabe tats&auml;chlich die `CPU` nutzt
im Vergleich dazu, wie viel Zeit sie mit dem Warten auf den Abschluss von I/O-Operationen verbringt.

### Littles Gesetz

In der Warteschlangentheorie ist eine der grundlegenden Formeln
das Littlesche Gesetz ([Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)):

$$
L = \lambda \cdot W
$$

Wobei:
- `L` -- die durchschnittliche Anzahl der Aufgaben im System
- `&lambda;` -- die durchschnittliche Rate eingehender Anfragen
- `W` -- die durchschnittliche Zeit, die eine Aufgabe im System verbringt

Dieses Gesetz ist universell und h&auml;ngt nicht von der spezifischen Systemimplementierung ab:
es spielt keine Rolle, ob Threads, Koroutinen oder asynchrone Callbacks verwendet werden.
Es beschreibt die grundlegende Beziehung zwischen Last, Latenz
und dem Grad der Nebenl&auml;ufigkeit.

Bei der Absch&auml;tzung der Nebenl&auml;ufigkeit f&uuml;r eine Serveranwendung l&ouml;sen Sie im Wesentlichen
das Problem,
wie viele Aufgaben gleichzeitig im System sein m&uuml;ssen,
damit Ressourcen effizient genutzt werden.

F&uuml;r `IO-bound`-Arbeitslasten ist die durchschnittliche Anfrageverarbeitungszeit gro&szlig;
im Vergleich zur Zeit, die f&uuml;r aktive Berechnungen aufgewendet wird.
Daher muss eine ausreichende Anzahl nebenl&auml;ufiger Aufgaben im System vorhanden sein,
damit die CPU nicht unt&auml;tig ist.

Genau diese Gr&ouml;&szlig;e l&auml;sst sich durch formale Analyse absch&auml;tzen,
indem man verbindet:
- Wartezeit,
- Durchsatz,
- und das erforderliche Niveau der Nebenl&auml;ufigkeit.

Ein &auml;hnlicher Ansatz wird in der Industrie zur Berechnung
der optimalen Thread-Pool-Gr&ouml;&szlig;e verwendet (siehe Brian Goetz, *"Java Concurrency in Practice"*).

> Die tats&auml;chlichen statistischen Daten f&uuml;r jedes Element dieser Formeln
> (Anzahl der SQL-Abfragen pro HTTP-Anfrage, DB-Latenzen, PHP-Framework-Durchsatz)
> sind in einem separaten Dokument gesammelt:
> [Statistische Daten f&uuml;r die Nebenl&auml;ufigkeitsberechnung](/de/docs/evidence/real-world-statistics.html).

### Grundlegende CPU-Auslastung

Um zu berechnen, welchen Anteil der Zeit der Prozessor
tats&auml;chlich n&uuml;tzliche Arbeit bei der Ausf&uuml;hrung einer einzelnen Aufgabe leistet, kann folgende Formel verwendet werden:

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` -- die Zeit, die f&uuml;r Berechnungen auf der CPU aufgewendet wird
- `T_io` -- die Zeit, die mit dem Warten auf I/O-Operationen verbracht wird

Die Summe `T_cpu + T_io` stellt die Gesamtlebensdauer einer Aufgabe
von Anfang bis Ende dar.

Der Wert `U` liegt zwischen 0 und 1 und gibt den Grad
der Prozessorauslastung an:
- `U &rarr; 1` kennzeichnet eine rechenintensive (`CPU-bound`) Aufgabe
- `U &rarr; 0` kennzeichnet eine Aufgabe, die die meiste Zeit mit dem Warten auf I/O verbringt (`IO-bound`)

Die Formel liefert somit eine quantitative Bewertung,
wie effizient die `CPU` genutzt wird
und ob die betreffende Arbeitslast `IO-bound` oder `CPU-bound` ist.

### Auswirkung der Nebenl&auml;ufigkeit

Bei der gleichzeitigen Ausf&uuml;hrung mehrerer `IO-bound`-Aufgaben kann die `CPU` die
`I/O`-Wartezeit einer Aufgabe nutzen, um Berechnungen f&uuml;r **eine andere** durchzuf&uuml;hren.

Die CPU-Auslastung mit `N` nebenl&auml;ufigen Aufgaben kann gesch&auml;tzt werden als:

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

Eine Erh&ouml;hung der Nebenl&auml;ufigkeit verbessert die `CPU`-Auslastung,
aber nur bis zu einem bestimmten Limit.

### Effizienzgrenze

Der maximale Gewinn durch Nebenl&auml;ufigkeit ist begrenzt durch das Verh&auml;ltnis
von `I/O`-Wartezeit zu Berechnungszeit:

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

In der Praxis bedeutet dies, dass die Anzahl wirklich n&uuml;tzlicher
nebenl&auml;ufiger Aufgaben ungef&auml;hr dem Verh&auml;ltnis `T_io / T_cpu` entspricht.

### Optimale Nebenl&auml;ufigkeit

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

Die Eins in der Formel ber&uuml;cksichtigt die Aufgabe, die gerade auf der `CPU` ausgef&uuml;hrt wird.
Bei einem gro&szlig;en `T_io / T_cpu`-Verh&auml;ltnis (was typisch f&uuml;r `IO-bound`-Arbeitslasten ist),
ist der Beitrag der Eins vernachl&auml;ssigbar, und die Formel wird oft zu `T_io / T_cpu` vereinfacht.

Diese Formel ist ein Spezialfall (f&uuml;r einen einzelnen Kern) der klassischen
Formel f&uuml;r die optimale Thread-Pool-Gr&ouml;&szlig;e, die von Brian Goetz
im Buch *"Java Concurrency in Practice"* (2006) vorgeschlagen wurde:

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

Das Verh&auml;ltnis `T_wait / T_service` ist als **Blockierungskoeffizient** bekannt.
Je h&ouml;her dieser Koeffizient ist, desto mehr nebenl&auml;ufige
Aufgaben k&ouml;nnen von einem einzelnen Kern effektiv genutzt werden.

Bei diesem Niveau der Nebenl&auml;ufigkeit verbringt der Prozessor die meiste Zeit
mit n&uuml;tzlicher Arbeit, und eine weitere Erh&ouml;hung der Aufgabenzahl
bringt keinen merklichen Gewinn mehr.

Genau deshalb sind asynchrone Ausf&uuml;hrungsmodelle
f&uuml;r `IO-bound` Web-Arbeitslasten am effektivsten.

## Beispielrechnung f&uuml;r eine typische Webanwendung

Betrachten wir ein vereinfachtes, aber ziemlich realistisches Modell einer durchschnittlichen serverseitigen Webanwendung.
Nehmen wir an, dass die Verarbeitung einer einzelnen `HTTP`-Anfrage haupts&auml;chlich die Interaktion mit einer Datenbank umfasst
und keine rechenintensiven Operationen enth&auml;lt.

### Ausgangsannahmen

- Ungef&auml;hr **20 SQL-Abfragen** werden pro HTTP-Anfrage ausgef&uuml;hrt
- Die Berechnung beschr&auml;nkt sich auf Datenmapping, Antwortserialisierung und Logging
- Die Datenbank befindet sich au&szlig;erhalb des Anwendungsprozesses (Remote-I/O)

> **Warum 20 Abfragen?**
> Dies ist die Mediansch&auml;tzung f&uuml;r ORM-Anwendungen mittlerer Komplexit&auml;t.
> Zum Vergleich:
> * WordPress generiert ~17 Abfragen pro Seite,
> * Drupal ohne Caching -- von 80 bis 100,
> * und eine typische Laravel/Symfony-Anwendung -- von 10 bis 30.
>
> Die Hauptquelle des Wachstums ist das N+1-Pattern, bei dem das ORM verwandte Entit&auml;ten
> mit separaten Abfragen l&auml;dt.

### Ausf&uuml;hrungszeitsch&auml;tzung

F&uuml;r die Sch&auml;tzung verwenden wir gemittelte Werte:

- Eine SQL-Abfrage:
    - I/O-Wartezeit: `T_io &asymp; 4 ms`
    - CPU-Berechnungszeit: `T_cpu &asymp; 0,05 ms`

Gesamt pro HTTP-Anfrage:

- `T_io = 20 &times; 4 ms = 80 ms`
- `T_cpu = 20 &times; 0,05 ms = 1 ms`

> **&Uuml;ber die gew&auml;hlten Latenzwerte.**
> Die I/O-Zeit f&uuml;r eine einzelne `SQL`-Abfrage besteht aus der Netzwerklatenz (`Round-Trip`)
> und der Ausf&uuml;hrungszeit der Abfrage auf dem DB-Server.
> Der Netzwerk-Round-Trip innerhalb eines einzelnen Rechenzentrums betr&auml;gt ~0,5 ms,
> und f&uuml;r Cloud-Umgebungen (Cross-AZ, Managed RDS) -- 1--5 ms.
> Unter Ber&uuml;cksichtigung der Ausf&uuml;hrungszeit einer m&auml;&szlig;ig komplexen Abfrage
> sind die resultierenden 4 ms pro Abfrage eine realistische Sch&auml;tzung f&uuml;r eine Cloud-Umgebung.
> Die CPU-Zeit (0,05 ms) deckt ORM-Ergebnismapping, Entity-Hydration
> und grundlegende Verarbeitungslogik ab.

### Arbeitslastcharakteristiken

Das Verh&auml;ltnis von Wartezeit zu Berechnungszeit:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

Dies bedeutet, dass die Aufgabe &uuml;berwiegend **IO-bound** ist:
Der Prozessor verbringt die meiste Zeit im Leerlauf
und wartet auf den Abschluss von I/O-Operationen.

### Sch&auml;tzung der Anzahl der Koroutinen

Die optimale Anzahl nebenl&auml;ufiger Koroutinen pro CPU-Kern
entspricht ungef&auml;hr dem Verh&auml;ltnis von I/O-Wartezeit zu Berechnungszeit:

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

Mit anderen Worten: ungef&auml;hr **80 Koroutinen pro Kern** erm&ouml;glichen das nahezu vollst&auml;ndige
Verbergen der I/O-Latenz bei gleichzeitig hoher CPU-Auslastung.

Zum Vergleich: [Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
liefert ein Beispiel mit einem Microservice, bei dem die Antwortzeit 50 ms und die Verarbeitungszeit 5 ms betr&auml;gt
auf einer Dual-Core-Maschine: `2 &times; (1 + 50/5) = 22 Threads` -- dasselbe Prinzip, dieselbe Formel.

### Skalierung nach Anzahl der Kerne

F&uuml;r einen Server mit `C` Kernen:

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

Zum Beispiel f&uuml;r einen 8-Kern-Prozessor:

$$
N_{total} \approx 8 \times 80 = 640 \text{ Koroutinen}
$$

Dieser Wert spiegelt das **n&uuml;tzliche Niveau der Nebenl&auml;ufigkeit** wider,
nicht ein festes Limit.

### Empfindlichkeit gegen&uuml;ber der Umgebung

Der Wert von 80 Koroutinen pro Kern ist keine universelle Konstante,
sondern das Ergebnis spezifischer Annahmen &uuml;ber die I/O-Latenz.
Je nach Netzwerkumgebung kann die optimale Anzahl nebenl&auml;ufiger Aufgaben
erheblich abweichen:

| Umgebung                        | T_io pro SQL-Abfrage | T_io gesamt (&times;20) | N pro Kern |
|---------------------------------|----------------------|--------------------------|------------|
| Localhost / Unix-Socket         | ~0,1 ms              | 2 ms                     | ~2         |
| LAN (einzelnes Rechenzentrum)  | ~1 ms                | 20 ms                    | ~20        |
| Cloud (Cross-AZ, RDS)          | ~4 ms                | 80 ms                    | ~80        |
| Remote-Server / Cross-Region   | ~10 ms               | 200 ms                   | ~200       |

Je gr&ouml;&szlig;er die Latenz, desto mehr Koroutinen werden ben&ouml;tigt,
um die CPU vollst&auml;ndig mit n&uuml;tzlicher Arbeit auszulasten.

### PHP-FPM vs Koroutinen: Ungef&auml;hre Berechnung

Um den praktischen Nutzen von Koroutinen abzusch&auml;tzen,
vergleichen wir zwei Ausf&uuml;hrungsmodelle auf demselben Server
mit derselben Arbeitslast.

#### Ausgangsdaten

**Server:** 8 Kerne, Cloud-Umgebung (Cross-AZ RDS).

**Arbeitslast:** typischer Laravel-API-Endpunkt --
Autorisierung, Eloquent-Abfragen mit Eager Loading, JSON-Serialisierung.

Basierend auf Benchmark-Daten von
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
und [Kinsta](https://kinsta.com/blog/php-benchmarks/):

| Parameter                                       | Wert       | Quelle            |
|-------------------------------------------------|------------|--------------------|
| Laravel-API-Durchsatz (30 vCPU, Localhost-DB)    | ~440 req/s | Sevalla, PHP 8.3  |
| Anzahl der PHP-FPM-Worker im Benchmark           | 15         | Sevalla           |
| Antwortzeit (W) im Benchmark                     | ~34 ms     | L/&lambda; = 15/440      |
| Speicher pro PHP-FPM-Worker                       | ~40 MB     | Typischer Wert    |

#### Schritt 1: Sch&auml;tzung von T_cpu und T_io

Im **Sevalla**-Benchmark l&auml;uft die Datenbank auf Localhost (Latenz <0,1 ms).
Bei ~10 SQL-Abfragen pro Endpunkt betr&auml;gt das gesamte I/O weniger als 1 ms.

Gegeben:
- Durchsatz: &lambda; &asymp; 440 req/s
- Anzahl gleichzeitig bedienter Anfragen (PHP-FPM-Worker): L = 15
- Datenbank auf Localhost, also T_io &asymp; 0

Nach Littles Gesetz:

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0,034 \, \text{s} \approx 34 \, \text{ms}
$$

Da in diesem Benchmark die Datenbank auf `localhost` l&auml;uft
und das gesamte `I/O` weniger als 1 ms betr&auml;gt,
spiegelt die resultierende durchschnittliche Antwortzeit fast vollst&auml;ndig
die `CPU`-Verarbeitungszeit pro Anfrage wider:

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

Das bedeutet, dass unter `localhost`-Bedingungen nahezu die gesamte Antwortzeit (~34 ms) `CPU` ist:
Framework, `Middleware`, `ORM`, Serialisierung.


Verschieben wir denselben Endpunkt in eine **Cloud-Umgebung** mit 20 `SQL`-Abfragen:

$$
T_{cpu} = 34 \text{ ms (Framework + Logik)}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms (DB-Wartezeit)}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

Blockierungskoeffizient:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2,4
$$

#### Schritt 2: PHP-FPM

Im `PHP-FPM`-Modell ist jeder Worker ein separater OS-Prozess.
W&auml;hrend der `I/O`-Wartezeit blockiert der Worker und kann keine anderen Anfragen verarbeiten.

Um 8 Kerne vollst&auml;ndig auszulasten, werden genug Worker ben&ouml;tigt,
sodass zu jedem Zeitpunkt 8 von ihnen `CPU`-Arbeit verrichten:

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3,4 = 27
$$

| Metrik                              | Wert          |
|--------------------------------------|---------------|
| Worker                              | 27            |
| Speicher (27 &times; 40 MB)              | **1,08 GB**   |
| Durchsatz (27 / 0,114)              | **237 req/s** |
| CPU-Auslastung                      | ~100%         |

In der Praxis setzen Administratoren oft `pm.max_children = 50--100`,
was &uuml;ber dem Optimum liegt. Zus&auml;tzliche Worker konkurrieren um CPU,
erh&ouml;hen die Anzahl der OS-Kontextwechsel
und verbrauchen Speicher, ohne den Durchsatz zu steigern.

#### Schritt 3: Koroutinen (Event Loop)

Im Koroutinen-Modell bedient ein einzelner Thread (pro Kern)
viele Anfragen. Wenn eine Koroutine auf I/O wartet,
wechselt der Scheduler in ~200 Nanosekunden zu einer anderen
(siehe [Empirische Grundlagen](/de/docs/evidence/coroutines-evidence.html)).

Die optimale Anzahl der Koroutinen ist dieselbe:

$$
N_{coroutines} = 8 \times 3,4 = 27
$$

| Metrik                 | Wert          |
|------------------------|---------------|
| Koroutinen             | 27            |
| Speicher (27 &times; ~2 MiB) | **54 MiB**    |
| Durchsatz              | **237 req/s** |
| CPU-Auslastung         | ~100%         |

Der Durchsatz ist **derselbe** -- weil die CPU der Engpass ist.
Aber der Speicher f&uuml;r Nebenl&auml;ufigkeit: **54 MiB vs 1,08 GB** -- ein **~20-facher** Unterschied.

> **&Uuml;ber die Stack-Gr&ouml;&szlig;e von Koroutinen.**
> Der Speicherbedarf einer Koroutine in PHP wird durch die reservierte C-Stack-Gr&ouml;&szlig;e bestimmt.
> Standardm&auml;&szlig;ig betr&auml;gt diese ~2 MiB, kann aber auf 128 KiB reduziert werden.
> Mit einem 128-KiB-Stack w&uuml;rde der Speicher f&uuml;r 27 Koroutinen nur ~3,4 MiB betragen.

#### Schritt 4: Was wenn die CPU-Last geringer ist?

Das `Laravel`-Framework im `FPM`-Modus verbraucht ~34 ms `CPU` pro Anfrage,
was die Neuinitialisierung von Services bei jeder Anfrage einschlie&szlig;t.

In einer zustandsbehafteten Laufzeitumgebung (was `True Async` ist) werden diese Kosten erheblich reduziert:
Routen sind kompiliert, der Dependency-Container ist initialisiert,
Verbindungspools werden wiederverwendet.

Wenn `T_cpu` von 34 ms auf 5 ms sinkt (was f&uuml;r den zustandsbehafteten Modus realistisch ist),
&auml;ndert sich das Bild dramatisch:

| T_cpu | Blockierungskoeff. | N (8 Kerne) | &lambda; (req/s) | Speicher (FPM) | Speicher (Koroutinen) |
|-------|-------------------|------------|-----------|--------------|---------------------|
| 34 ms | 2,4               | 27         | 237       | 1,08 GB      | 54 MiB              |
| 10 ms | 8                 | 72         | 800       | 2,88 GB      | 144 MiB             |
| 5 ms  | 16                | 136        | 1 600     | 5,44 GB      | 272 MiB             |
| 1 ms  | 80                | 648        | 8 000     | **25,9 GB**  | **1,27 GiB**        |

Bei `T_cpu = 1 ms` (leichtgewichtiger Handler, minimaler Overhead):
- PHP-FPM w&uuml;rde **648 Prozesse und 25,9 GB RAM** ben&ouml;tigen -- unrealistisch
- Koroutinen ben&ouml;tigen dieselben 648 Aufgaben und **1,27 GiB** -- **~20x weniger**

#### Schritt 5: Littles Gesetz -- Verifikation &uuml;ber den Durchsatz

Verifizieren wir das Ergebnis f&uuml;r `T_cpu = 5 ms`:

$$
\lambda = \frac{L}{W} = \frac{136}{0,085} = 1\,600 \text{ req/s}
$$

Um denselben Durchsatz zu erreichen, ben&ouml;tigt PHP-FPM 136 Worker.
Jeder belegt ~40 MB:

$$
136 \times 40 \text{ MB} = 5,44 \text{ GB nur f&uuml;r Worker}
$$

Koroutinen:

$$
136 \times 2 \text{ MiB} = 272 \text{ MiB}
$$

Die freigewordenen ~5,2 GB k&ouml;nnen f&uuml;r Caches,
DB-Verbindungspools oder die Verarbeitung weiterer Anfragen verwendet werden.

#### Zusammenfassung: Wann Koroutinen einen Vorteil bieten

| Bedingung                                       | Vorteil durch Koroutinen                                                 |
|-------------------------------------------------|--------------------------------------------------------------------------|
| Schweres Framework, Localhost-DB (T_io &asymp; 0)     | Minimal -- die Arbeitslast ist CPU-bound                                 |
| Schweres Framework, Cloud-DB (T_io = 80 ms)    | Moderat -- ~20x Speichereinsparung bei gleichem Durchsatz                |
| Leichtgewichtiger Handler, Cloud-DB             | **Maximum** -- Durchsatzsteigerung bis zu 13x, ~20x Speichereinsparung  |
| Microservice / API Gateway                      | **Maximum** -- nahezu reines I/O, Zehntausende req/s auf einem Server    |

**Fazit:** Je gr&ouml;&szlig;er der Anteil von I/O an der Gesamtanfragezeit und je leichter die CPU-Verarbeitung,
desto gr&ouml;&szlig;er ist der Vorteil durch Koroutinen.
F&uuml;r IO-bound-Anwendungen (die Mehrheit der modernen Webdienste)
erm&ouml;glichen Koroutinen eine mehrfach effizientere Nutzung derselben CPU,
bei um Gr&ouml;&szlig;enordnungen geringerem Speicherverbrauch.

### Praktische Hinweise

- Eine Erh&ouml;hung der Koroutinenanzahl &uuml;ber das Optimum hinaus bringt selten einen Vorteil,
  ist aber auch kein Problem: Koroutinen sind leichtgewichtig, und der Overhead durch "zus&auml;tzliche"
  Koroutinen ist unvergleichlich gering gegen&uuml;ber den Kosten von OS-Threads
- Die tats&auml;chlichen Einschr&auml;nkungen werden:
    - Datenbank-Verbindungspool
    - Netzwerklatenz
    - Back-Pressure-Mechanismen
    - Limits f&uuml;r offene Dateideskriptoren (ulimit)
- F&uuml;r solche Arbeitslasten erweist sich das *Event Loop + Koroutinen*-Modell als
  deutlich effizienter als das klassische blockierende Modell

### Fazit

F&uuml;r eine typische moderne Webanwendung,
bei der I/O-Operationen &uuml;berwiegen,
erm&ouml;glicht das asynchrone Ausf&uuml;hrungsmodell:
- effektives Verbergen der I/O-Latenz
- deutliche Verbesserung der CPU-Auslastung
- Reduzierung des Bedarfs an einer gro&szlig;en Anzahl von Threads

Genau in solchen Szenarien werden die Vorteile der Asynchronit&auml;t
am deutlichsten demonstriert.

---

### Weiterf&uuml;hrende Lekt&uuml;re

- [Swoole in der Praxis: Reale Messungen](/de/docs/evidence/swoole-evidence.html) -- Produktionsf&auml;lle (Appwrite +91%, IdleMMO 35M req/Tag), unabh&auml;ngige Benchmarks mit und ohne DB, TechEmpower
- [Python asyncio in der Praxis](/de/docs/evidence/python-evidence.html) -- Duolingo +40%, Super.com -90% Kosten, uvloop-Benchmarks, Gegenargumente
- [Empirische Grundlagen: Warum Single-Threaded-Koroutinen funktionieren](/de/docs/evidence/coroutines-evidence.html) -- Messungen der Kontextwechselkosten, Vergleich mit OS-Threads, akademische Forschung und Industrie-Benchmarks

---

### Referenzen und Literatur

- Brian Goetz, *Java Concurrency in Practice* (2006) -- Formel f&uuml;r die optimale Thread-Pool-Gr&ouml;&szlig;e: `N = cores &times; (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) -- praktische Anwendung der Goetz-Formel mit Beispielen und Herleitung &uuml;ber Littles Gesetz
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) -- detaillierte Analyse der Formel unter Ber&uuml;cksichtigung der Ziel-CPU-Auslastung
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) -- Messungen der Auswirkungen der Netzwerklatenz auf die PostgreSQL-Leistung
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) -- Richtlinien f&uuml;r akzeptable SQL-Abfragelatenzen in Webanwendungen
