---
layout: docs
lang: de
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /de/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — Ausfuehrung der aktuellen Coroutine unterbrechen. Vollstaendige Dokumentation: Beispiele fuer kooperatives Multitasking."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Unterbricht die Ausfuehrung der aktuellen Coroutine

## Beschreibung

```php
suspend: void
```

Unterbricht die Ausfuehrung der aktuellen Coroutine und gibt die Kontrolle an den Scheduler ab.
Die Ausfuehrung der Coroutine wird spaeter fortgesetzt, wenn der Scheduler entscheidet, sie auszufuehren.

`suspend()` ist eine Funktion, die von der True Async-Erweiterung bereitgestellt wird.

## Parameter

Dieses Konstrukt hat keine Parameter.

## Rueckgabewerte

Die Funktion gibt keinen Wert zurueck.

## Beispiele

### Beispiel #1 Grundlegende Verwendung von suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Vor suspend\n";
    suspend();
    echo "Nach suspend\n";
});

echo "Hauptcode\n";
?>
```

**Ausgabe:**
```
Vor suspend
Hauptcode
Nach suspend
```

### Beispiel #2 Mehrfaches Suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine gestartet\n";
?>
```

**Ausgabe:**
```
Iteration 1
Coroutine gestartet
Iteration 2
Iteration 3
```

### Beispiel #3 Kooperatives Multitasking

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // Anderen Coroutinen die Chance geben zu laufen
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**Ausgabe:**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### Beispiel #4 Explizite Kontrollabgabe

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starte lange Arbeit\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Berechnungen

        if ($i % 100000 === 0) {
            suspend(); // Periodisch Kontrolle abgeben
        }
    }

    echo "Arbeit abgeschlossen\n";
});

spawn(function() {
    echo "Andere Coroutine arbeitet ebenfalls\n";
});
?>
```

### Beispiel #5 suspend aus verschachtelten Funktionen

`suspend()` funktioniert aus jeder Aufruftiefe — es muss nicht direkt aus der Coroutine aufgerufen werden:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Verschachtelte Funktion: vor suspend\n";
    suspend();
    echo "Verschachtelte Funktion: nach suspend\n";
}

function deeplyNested() {
    echo "Tiefer Aufruf: Start\n";
    nestedSuspend();
    echo "Tiefer Aufruf: Ende\n";
}

spawn(function() {
    echo "Coroutine: vor verschachteltem Aufruf\n";
    deeplyNested();
    echo "Coroutine: nach verschachteltem Aufruf\n";
});

spawn(function() {
    echo "Andere Coroutine: arbeitet\n";
});
?>
```

**Ausgabe:**
```
Coroutine: vor verschachteltem Aufruf
Tiefer Aufruf: Start
Verschachtelte Funktion: vor suspend
Andere Coroutine: arbeitet
Verschachtelte Funktion: nach suspend
Tiefer Aufruf: Ende
Coroutine: nach verschachteltem Aufruf
```

### Beispiel #6 suspend in einer Warteschleife

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Warten, bis das Flag true wird
    while (!$ready) {
        suspend(); // Kontrolle abgeben
    }

    echo "Bedingung erfuellt!\n";
});

spawn(function() use (&$ready) {
    echo "Vorbereitung...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Bereit!\n";
});
?>
```

**Ausgabe:**
```
Vorbereitung...
Bereit!
Bedingung erfuellt!
```

## Hinweise

> **Hinweis:** `suspend()` ist eine Funktion. Der Aufruf als `suspend` (ohne Klammern) ist falsch.

> **Hinweis:** In TrueAsync wird jeder ausgefuehrte Code als Coroutine behandelt,
> daher kann `suspend()` ueberall aufgerufen werden (einschliesslich des Hauptskripts).

> **Hinweis:** Nach dem Aufruf von `suspend()` wird die Coroutine-Ausfuehrung nicht sofort fortgesetzt,
> sondern wenn der Scheduler entscheidet, sie auszufuehren. Die Reihenfolge der Coroutine-Fortsetzung ist nicht garantiert.

> **Hinweis:** In den meisten Faellen ist die explizite Verwendung von `suspend()` nicht erforderlich.
> Coroutinen werden bei I/O-Operationen automatisch unterbrochen
> (Dateilesen, Netzwerkanfragen usw.).

> **Hinweis:** Die Verwendung von `suspend()`
> in Endlosschleifen ohne I/O-Operationen kann zu hoher CPU-Auslastung fuehren.
> Sie koennen auch `Async\timeout()` verwenden.

## Changelog

| Version   | Beschreibung                            |
|-----------|-----------------------------------------|
| 1.0.0     | Funktion `suspend()` hinzugefuegt      |

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) - Starten einer Coroutine
- [await()](/de/docs/reference/await.html) - Warten auf ein Coroutine-Ergebnis
