---
layout: docs
lang: de
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /de/docs/reference/delay.html
page_title: "delay()"
description: "delay() — eine Coroutine fuer eine bestimmte Anzahl von Millisekunden unterbrechen."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Unterbricht die Ausfuehrung der aktuellen Coroutine fuer die angegebene Anzahl von Millisekunden.

## Beschreibung

```php
delay(int $ms): void
```

Unterbricht die Coroutine und gibt die Kontrolle an den Scheduler ab. Nach `$ms` Millisekunden wird die Coroutine fortgesetzt.
Andere Coroutinen werden waehrend der Wartezeit weiter ausgefuehrt.

## Parameter

**`ms`**
Wartezeit in Millisekunden. Bei `0` gibt die Coroutine einfach die Kontrolle an den Scheduler ab (aehnlich wie `suspend()`, aber mit Einreihung in die Warteschlange).

## Rueckgabewerte

Kein Rueckgabewert.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // 1 Sekunde warten
    echo "1 Sekunde vergangen\n";
});
?>
```

### Beispiel #2 Periodische Ausfuehrung

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Status wird geprueft...\n";
        delay(5000); // Alle 5 Sekunden
    }
});
?>
```

## Hinweise

> **Hinweis:** `delay()` blockiert nicht den gesamten PHP-Prozess — nur die aktuelle Coroutine wird blockiert.

> **Hinweis:** `delay()` startet den Scheduler automatisch, wenn er noch nicht gestartet wurde.

## Siehe auch

- [suspend()](/de/docs/reference/suspend.html) — Kontrolle abgeben ohne Verzoegerung
- [timeout()](/de/docs/reference/timeout.html) — ein Timeout erstellen, um die Wartezeit zu begrenzen
