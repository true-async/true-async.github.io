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

Das TrueAsync-Projekt wird über den offiziellen `RFC`-Prozess auf wiki.php.net vorangetrieben.
Bisher wurden zwei `RFCs` veröffentlicht, die das grundlegende Nebenläufigkeitsmodell
und die strukturierte Nebenläufigkeit beschreiben.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Version: 1.7</span>
<span>Zielversion: PHP 8.6+</span>
<span class="rfc-badge discussion">Under Discussion</span>
</div>

Der Haupt-RFC, der das Nebenläufigkeitsmodell für PHP definiert.
Beschreibt Koroutinen, Funktionen `spawn()` / `await()` / `suspend()`,
das `Coroutine`-Objekt, die Schnittstellen `Awaitable` und `Completable`,
den kooperativen Abbruchmechanismus, die `Fiber`-Integration,
Fehlerbehandlung und Graceful Shutdown.

**Kernprinzipien:**

- Minimale Änderungen am bestehenden Code zur Aktivierung von Nebenläufigkeit
- Koroutinen bewahren die Illusion sequenzieller Ausführung
- Automatisches Umschalten der Koroutinen bei I/O-Operationen
- Kooperativer Abbruch — „cancellable by design"
- Standard-C-API für Erweiterungen

[RFC auf wiki.php.net lesen &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope und strukturierte Nebenläufigkeit

<div class="rfc-meta">
<span>Autor: Edmond [HT]</span>
<span>Version: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Erweiterung des Basis-RFC. Führt die Klasse `Scope` ein, die
die Lebensdauer von Koroutinen an den lexikalischen Gültigkeitsbereich bindet.
Beschreibt die Scope-Hierarchie, Fehlerweiterleitung,
die „Zombie"-Koroutinen-Richtlinie und kritische Abschnitte über `protect()`.

**Was es löst:**

- Verhinderung von Koroutinen-Leaks über den Scope hinaus
- Automatische Ressourcenbereinigung beim Verlassen des Scope
- Hierarchischer Abbruch: Abbruch des Elternteils → Abbruch aller Kinder
- Schutz kritischer Abschnitte vor Abbruch
- Erkennung von Deadlocks und Self-Await

[RFC auf wiki.php.net lesen &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Wie diese RFCs zusammenhängen

Der erste RFC definiert **niedrigstufige Primitive** — Koroutinen,
Basisfunktionen und C-API für Erweiterungen. Der zweite RFC fügt
**strukturierte Nebenläufigkeit** hinzu — Mechanismen zur Verwaltung von Koroutinen-Gruppen,
die nebenläufigen Code sicher und vorhersagbar machen.

Zusammen bilden sie ein vollständiges asynchrones Programmiermodell für PHP:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **Ebene**    | Primitive                         | Verwaltung                              |
| **Bietet**   | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogien**| Go Goroutines, Kotlin Coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Ziel**     | Ausführung nebenläufigen Codes    | Sichere Lebenszyklus-Verwaltung         |

## An der Diskussion teilnehmen

RFCs werden auf der Mailingliste [internals@lists.php.net](mailto:internals@lists.php.net)
und auf [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"} diskutiert.

Treten Sie auch der Diskussion auf [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"} bei.
