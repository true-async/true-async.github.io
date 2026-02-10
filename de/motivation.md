---
layout: page
lang: de
path_key: "/motivation.html"
nav_active: motivation
permalink: /de/motivation.html
page_title: "Motivation"
description: "Warum PHP eingebaute asynchrone Fähigkeiten braucht"
---

## Warum braucht PHP Asynchronität?

`PHP` ist eine der letzten großen Sprachen, die noch keine eingebaute
Unterstützung für nebenläufige Ausführung **auf Sprachebene** hat. Python hat `asyncio`, `JavaScript` basiert nativ
auf einer Event Loop, `Go` hat Goroutines, `Kotlin` hat Coroutines. `PHP` verbleibt
im Paradigma „eine Anfrage — ein Prozess", obwohl die meisten
realen Anwendungen den Großteil ihrer Zeit mit dem Warten auf `I/O` verbringen (`IO Bound`).

## Das Fragmentierungsproblem

Heute wird Asynchronität in `PHP` durch Erweiterungen realisiert: `Swoole`, `AMPHP`, `ReactPHP`.
Jede davon schafft **ihr eigenes Ökosystem** mit inkompatiblen `APIs`,
eigenen Datenbanktreibern, `HTTP`-Clients und Servern.

Dies führt zu kritischen Problemen:

- **Code-Duplizierung** — jede Erweiterung muss Treiber
  für `MySQL`, `PostgreSQL`, `Redis` und andere Systeme neu schreiben
- **Inkompatibilität** — eine für `Swoole` geschriebene Bibliothek funktioniert nicht mit `AMPHP`
  und umgekehrt
- **Einschränkungen** — Erweiterungen können Standard-`PHP`-Funktionen
  (`file_get_contents`, `fread`, `curl_exec`) nicht nicht-blockierend machen,
  da sie keinen Zugriff auf den Kern haben
- **Einstiegshürde** — Entwickler müssen ein separates Ökosystem erlernen,
  anstatt vertraute Werkzeuge zu nutzen

## Die Lösung: Integration in den Kern

`TrueAsync` verfolgt einen anderen Ansatz — **Asynchronität auf PHP-Kern-Ebene**.
Das bedeutet:

### Transparenz

Bestehender synchroner Code funktioniert in Koroutinen ohne Änderungen.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — all diese Funktionen
werden automatisch nicht-blockierend, wenn sie innerhalb einer Koroutine ausgeführt werden.

```php
// Dieser Code läuft bereits nebenläufig!
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // Die Koroutine wird während der HTTP-Anfrage pausiert,
    // andere Koroutinen laufen weiter
});
```

### Keine gefärbten Funktionen

Im Gegensatz zu Python (`async def` / `await`) und JavaScript (`async` / `await`)
erfordert `TrueAsync` keine Markierung von Funktionen als asynchron.
Jede Funktion kann in einer Koroutine ausgeführt werden — es gibt keine Trennung
zwischen einer „synchronen" und „asynchronen" Welt.

### Ein einheitlicher Standard

Das standardmäßige `True Async ABI` als Teil von `Zend` ermöglicht es **jeder** Erweiterung, nicht-blockierendes `I/O` zu unterstützen:
`MySQL`, `PostgreSQL`, `Redis`, Dateioperationen, Sockets — alles über eine einzige Schnittstelle.
Kein Duplizieren von Treibern für jedes Async-Framework mehr.

### Abwärtskompatibilität

Bestehender Code funktioniert weiterhin, aber jetzt ist der gesamte PHP-Code
standardmäßig asynchron. Überall.

## PHP-Workload: Warum das gerade jetzt wichtig ist

Eine typische PHP-Anwendung (Laravel, Symfony, WordPress) verbringt
**70–90% der Zeit mit dem Warten auf I/O**: Datenbankabfragen, HTTP-Aufrufe an externe APIs,
Dateien lesen. Die ganze Zeit sitzt die CPU untätig herum.

Mit Koroutinen wird diese Zeit effizient genutzt:

| Szenario                       | Ohne Koroutinen | Mit Koroutinen   |
|--------------------------------|-----------------|------------------|
| 3 DB-Abfragen à 20ms          | 60ms            | ~22ms            |
| HTTP + DB + Datei              | sequenziell     | parallel         |
| 10 API-Aufrufe                 | 10 × Latenz     | ~1 × Latenz      |

Mehr erfahren:
[IO-Bound vs CPU-Bound](/de/docs/evidence/concurrency-efficiency.html),
[Nebenläufigkeitsstatistiken](/de/docs/evidence/real-world-statistics.html).

## Praktische Szenarien

- **Webserver** — Verarbeitung vieler Anfragen in einem einzigen Prozess
  (`FrankenPHP`, `RoadRunner`)
- **API-Gateway** — parallele Datenaggregation aus mehreren Microservices
- **Hintergrundaufgaben** — nebenläufige Warteschlangenverarbeitung
- **Echtzeit** — WebSocket-Server, Chatbots, Streaming

## Siehe auch:

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope und strukturierte Nebenläufigkeit](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [TrueAsync-Dokumentation](/de/docs.html)
- [Interaktive Koroutinen-Demo](/de/interactive/coroutine-demo.html)
