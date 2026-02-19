---
layout: page
lang: de
path_key: "/rfc.html"
nav_active: rfc
permalink: /de/rfc.html
page_title: "RFC"
description: "Offizielle Vorschläge zur Integration von Asynchronität in den PHP-Kern"
---

## PHP RFC: True Async

Das TrueAsync-Projekt wurde etwa ein Jahr lang über den offiziellen `RFC`-Prozess auf wiki.php.net vorangetrieben.
Zwei `RFCs` wurden veröffentlicht, die das grundlegende Nebenläufigkeitsmodell
und strukturierte Nebenläufigkeit beschreiben.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Version: 1.7</span>
<span>Zielversion: PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

Das Haupt-`RFC`, das das Nebenläufigkeitsmodell für PHP definiert.
Beschreibt Coroutinen, Funktionen `spawn()` / `await()` / `suspend()`,
das `Coroutine`-Objekt, `Awaitable`- und `Completable`-Interfaces,
den kooperativen Abbruchmechanismus, `Fiber`-Integration,
Fehlerbehandlung und Graceful Shutdown.

**Schlüsselprinzipien:**

- Minimale Änderungen am bestehenden Code zur Aktivierung von Nebenläufigkeit
- Coroutinen bewahren die Illusion sequentieller Ausführung
- Automatisches Umschalten der Coroutinen bei I/O-Operationen
- Kooperativer Abbruch — „cancellable by design"
- Standard-C-API für Erweiterungen

[RFC auf wiki.php.net lesen &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope und strukturierte Nebenläufigkeit

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Version: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Eine Erweiterung des Basis-RFC. Führt die Klasse `Scope` ein, die
die Lebensdauer von Coroutinen an den lexikalischen Gültigkeitsbereich bindet.
Beschreibt die Scope-Hierarchie, Fehlerausbreitung,
die „Zombie"-Coroutinen-Richtlinie und kritische Abschnitte über `protect()`.

**Was es löst:**

- Verhinderung von Coroutinen-Lecks außerhalb des Scope
- Automatische Ressourcenbereinigung beim Verlassen des Scope
- Hierarchischer Abbruch: Abbruch des Elternteils → Abbruch aller Kinder
- Schutz kritischer Abschnitte vor Abbruch
- Deadlock- und Self-Await-Erkennung

[RFC auf wiki.php.net lesen &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Wie diese RFCs zusammenhängen

Das erste `RFC` definiert **Low-Level-Primitive** — Coroutinen,
Basisfunktionen und C-API für Erweiterungen. Das zweite RFC fügt
**strukturierte Nebenläufigkeit** hinzu — Mechanismen zur Verwaltung von Coroutinen-Gruppen,
die nebenläufigen Code sicher und vorhersagbar machen.

Zusammen bilden sie ein vollständiges asynchrones Programmiermodell für PHP:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **Ebene**    | Primitive                         | Verwaltung                              |
| **Bietet**   | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogien**| Go Goroutines, Kotlin Coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Ziel**     | Nebenläufigen Code ausführen      | Sichere Lebenszyklusverwaltung          |

## Aktueller RFC-Status

Derzeit ist das Projekt `TrueAsync` auf Unsicherheit im `RFC`-Prozess gestoßen.
In den letzten Monaten ist die Diskussion praktisch zum Stillstand gekommen, und es gibt keine Klarheit über seine Zukunft.
Es ist ziemlich offensichtlich, dass das `RFC` keine Abstimmung bestehen kann, und es gibt keine Möglichkeit, dies zu ändern.

Aus diesen Gründen wird der `RFC`-Prozess derzeit als eingefroren betrachtet,
und das Projekt wird sich innerhalb der offenen Community weiterentwickeln, ohne „offiziellen" Status.

## An der Diskussion teilnehmen

RFCs werden auf der Mailingliste [internals@lists.php.net](mailto:internals@lists.php.net)
und auf [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"} diskutiert.

Treten Sie auch der Diskussion auf [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"} bei.
