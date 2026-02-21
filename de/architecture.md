---
layout: architecture
lang: de
path_key: "/architecture.html"
nav_active: architecture
permalink: /de/architecture.html
page_title: "Architektur"
description: "Internes Design der TrueAsync-Komponenten -- Ressourcenpool, PDO Pool, Diagramme und C API."
---

## Uebersicht

Der Architekturbereich beschreibt das interne Design der wichtigsten TrueAsync-Komponenten
auf der C-Code-Ebene: Datenstrukturen, Algorithmen, Integration mit der Zend Engine
und Interaktion zwischen dem PHP-Kern und der Async-Erweiterung.

Diese Materialien richten sich an Entwickler, die verstehen moechten,
wie TrueAsync "unter der Haube" funktioniert, oder planen, eigene
Erweiterungen zu erstellen.

### [TrueAsync ABI](/de/architecture/zend-async-api.html)

Das Herzstueck der asynchronen ABI: Funktionszeiger, Erweiterungsregistrierungssystem,
globaler Zustand (`zend_async_globals_t`), `ZEND_ASYNC_*`-Makros
und API-Versionierung.

### [Koroutinen, Scheduler und Reactor](/de/architecture/scheduler-reactor.html)

Internes Design des Koroutinen-Schedulers und Event-Reactors:
Warteschlangen (Ringpuffer), Kontextwechsel ueber Fiber,
Microtasks, libuv-Event-Loop, Fiber-Kontextpool und geordnetes Herunterfahren.

### [Events und das Event-Modell](/de/architecture/events.html)

`zend_async_event_t` -- die Basisdatenstruktur, von der
alle asynchronen Primitive erben. Callback-System, Ref-Counting,
Event-Referenz, Flags, Event-Typ-Hierarchie.

### [Waker -- Warte- und Aufweckmechanismus](/de/architecture/waker.html)

Waker ist die Verbindung zwischen einer Koroutine und Events.
Statuswerte, `resume_when`, Koroutinen-Callbacks, Fehlerweiterleitung,
`zend_coroutine_t`-Struktur und Switch-Handler.

### [Garbage Collection im asynchronen Kontext](/de/architecture/async-gc.html)

Wie PHP GC mit Koroutinen, Scope und Kontexten funktioniert: `get_gc`-Handler,
Fiber-Stack-Traversierung, Zombie-Koroutinen, hierarchischer Kontext
und Schutz vor zirkulaeren Referenzen.

## Komponenten

### [Async\Pool](/de/architecture/pool.html)

Universeller Ressourcenpool. Behandelte Themen:
- Zweistufige Datenstruktur (ABI im Kern + intern in der Erweiterung)
- Acquire/Release-Algorithmen mit einer FIFO-Warteschlange wartender Koroutinen
- Healthcheck ueber periodischen Timer
- Circuit Breaker mit drei Zustaenden
- C API fuer Erweiterungen (`ZEND_ASYNC_POOL_*`-Makros)

### [PDO Pool](/de/architecture/pdo-pool.html)

PDO-spezifische Schicht ueber `Async\Pool`. Behandelte Themen:
- Template-Verbindung und verzoegerte Erstellung realer Verbindungen
- Bindung von Verbindungen an Koroutinen ueber HashTable
- Pinning waehrend aktiver Transaktionen und Statements
- Automatisches Rollback und Bereinigung bei Koroutinen-Abschluss
- Zugangsdatenverwaltung in der Factory
