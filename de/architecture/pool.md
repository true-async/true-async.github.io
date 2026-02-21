---
layout: architecture
lang: de
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /de/architecture/pool.html
page_title: "Async\\Pool Architektur"
description: "Internes Design des universellen Ressourcenpools Async\\Pool -- Datenstrukturen, Acquire/Release-Algorithmen, Healthcheck, Circuit Breaker."
---

# Async\Pool Architektur

> Dieser Artikel beschreibt das interne Design des universellen Ressourcenpools.
> Wenn Sie eine Nutzungsanleitung suchen, siehe [Async\Pool](/de/docs/components/pool.html).
> Fuer die PDO-spezifische Schicht, siehe [PDO Pool Architektur](/de/architecture/pdo-pool.html).

## Datenstruktur

Der Pool ist in zwei Schichten implementiert: eine oeffentliche ABI-Struktur im PHP-Kern
und eine erweiterte interne Struktur in der Async-Erweiterung.

![Pool-Datenstrukturen](/diagrams/de/architecture-pool/data-structures.svg)

## Zwei Erstellungspfade

Ein Pool kann aus PHP-Code (ueber den `Async\Pool`-Konstruktor)
oder aus einer C-Erweiterung (ueber die interne API) erstellt werden.

| Pfad  | Funktion                            | Callbacks                      | Verwendet von          |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | Benutzercode           |
| C API | `zend_async_pool_create_internal()` | Funktionszeiger                | PDO, andere Erweiterungen |

Der Unterschied liegt in `handler_flags`. Wenn das Flag gesetzt ist, ruft der Pool die C-Funktion direkt auf,
ohne den Overhead des Aufrufens eines PHP callable ueber `zend_call_function()`.

## Acquire: Erhalten einer Ressource

![acquire() -- Interner Algorithmus](/diagrams/de/architecture-pool/acquire.svg)

### Warten auf eine Ressource

Wenn alle Ressourcen belegt sind und `max_size` erreicht ist, suspendiert die Koroutine
ueber `ZEND_ASYNC_SUSPEND()`. Der Wartemechanismus aehnelt Channels:

1. Eine `zend_async_pool_waiter_t`-Struktur wird erstellt
2. Der Waiter wird zur FIFO-`waiters`-Warteschlange hinzugefuegt
3. Ein Callback zum Aufwecken wird registriert
4. Wenn ein Timeout gesetzt ist -- wird ein Timer registriert
5. `ZEND_ASYNC_SUSPEND()` -- die Koroutine gibt die Kontrolle ab

Das Aufwecken erfolgt, wenn eine andere Koroutine `release()` aufruft.

## Release: Zurueckgeben einer Ressource

![release() -- Interner Algorithmus](/diagrams/de/architecture-pool/release.svg)

## Healthcheck: Hintergrundueberwachung

Wenn `healthcheckInterval > 0`, wird beim Erstellen des Pools ein periodischer Timer gestartet.
Der Timer wird ueber `ZEND_ASYNC_NEW_TIMER_EVENT` in den Reactor integriert.

![Healthcheck -- Periodische Pruefung](/diagrams/de/architecture-pool/healthcheck.svg)

Der Healthcheck ueberprueft **nur** freie Ressourcen. Belegte Ressourcen werden nicht beeinflusst.
Wenn nach dem Entfernen toter Ressourcen die Gesamtzahl unter `min` faellt, erstellt der Pool Ersatz.

## Ringpuffer

Freie Ressourcen werden in einem Ringpuffer gespeichert -- einem Ring-Buffer mit fester Kapazitaet.
Die anfaengliche Kapazitaet betraegt 8 Elemente, die bei Bedarf erweitert wird.

`push`- und `pop`-Operationen laufen in O(1). Der Puffer verwendet zwei Zeiger (`head` und `tail`),
was ein effizientes Hinzufuegen und Extrahieren von Ressourcen ohne Verschieben von Elementen ermoeglicht.

## Integration mit dem Event-System

Der Pool erbt von `zend_async_event_t` und implementiert einen vollstaendigen Satz von Event-Handlern:

| Handler        | Zweck                                                      |
|----------------|------------------------------------------------------------|
| `add_callback` | Callback registrieren (fuer Waiter)                        |
| `del_callback` | Callback entfernen                                         |
| `start`        | Event starten (NOP)                                        |
| `stop`         | Event stoppen (NOP)                                        |
| `dispose`      | Vollstaendige Bereinigung: Speicher freigeben, Callbacks zerstoeren |

Dies ermoeglicht:
- Suspendieren und Fortsetzen von Koroutinen ueber Event-Callbacks
- Integration des Healthcheck-Timers mit dem Reactor
- Ordnungsgemaesse Freigabe von Ressourcen durch Event-Disposal

## Garbage Collection

Der PHP-Pool-Wrapper (`async_pool_obj_t`) implementiert ein benutzerdefiniertes `get_gc`,
das alle Ressourcen aus dem Idle-Puffer als GC-Roots registriert.
Dies verhindert vorzeitige Garbage Collection freier Ressourcen,
die keine expliziten Referenzen aus PHP-Code haben.

## Circuit Breaker

Der Pool implementiert die `CircuitBreaker`-Schnittstelle mit drei Zustaenden:

![Circuit Breaker Zustaende](/diagrams/de/architecture-pool/circuit-breaker.svg)

Uebergaenge koennen manuell oder automatisch ueber `CircuitBreakerStrategy` erfolgen:
- `reportSuccess()` wird bei einem erfolgreichen `release` aufgerufen (Ressource hat `beforeRelease` bestanden)
- `reportFailure()` wird aufgerufen, wenn `beforeRelease` `false` zurueckgegeben hat
- Die Strategie entscheidet, wann die Zustaende gewechselt werden

## Close: Herunterfahren des Pools

Wenn der Pool geschlossen wird:

1. Das Pool-Event wird als CLOSED markiert
2. Der Healthcheck-Timer wird gestoppt
3. Alle wartenden Koroutinen werden mit einer `PoolException` aufgeweckt
4. Alle freien Ressourcen werden ueber `destructor` zerstoert
5. Belegte Ressourcen leben weiter -- sie werden bei `release` zerstoert

## C API fuer Erweiterungen

Erweiterungen (PDO, Redis usw.) verwenden den Pool ueber Makros:

| Makro                                            | Funktion                     |
|--------------------------------------------------|------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Pool mit C-Callbacks erstellen |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | PHP-Wrapper fuer Pool erstellen |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Ressource erhalten           |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Ressource freigeben          |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Pool schliessen              |

Alle Makros rufen Funktionszeiger auf, die von der Async-Erweiterung beim Laden registriert wurden.
Dies stellt die Isolation sicher: Der PHP-Kern haengt nicht von der spezifischen Pool-Implementierung ab.

## Sequenz: Vollstaendiger Acquire-Release-Zyklus

![Vollstaendiger acquire -> use -> release Zyklus](/diagrams/de/architecture-pool/full-cycle.svg)

## Was kommt als Naechstes?

- [Async\Pool: Anleitung](/de/docs/components/pool.html) -- wie man den Pool verwendet
- [PDO Pool Architektur](/de/architecture/pdo-pool.html) -- PDO-spezifische Schicht
- [Koroutinen](/de/docs/components/coroutines.html) -- wie Koroutinen funktionieren
