---
layout: docs
lang: de
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /de/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — kontrolliertes Herunterfahren des Schedulers mit Abbruch aller Coroutinen."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Leitet ein kontrolliertes Herunterfahren des Schedulers ein. Alle Coroutinen erhalten eine Abbruchanforderung.

## Beschreibung

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Startet das kontrollierte Herunterfahren: Alle aktiven Coroutinen werden abgebrochen, und die Anwendung laeuft weiter, bis sie auf natuerliche Weise abgeschlossen sind.

## Parameter

**`cancellationError`**
Ein optionaler Abbruchfehler, der an die Coroutinen uebergeben wird. Wenn nicht angegeben, wird eine Standardnachricht verwendet.

## Rueckgabewerte

Kein Rueckgabewert.

## Beispiele

### Beispiel #1 Behandlung eines Beendigungssignals

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Server, der Anfragen verarbeitet
spawn(function() {
    // Bei Empfang eines Signals — kontrolliert herunterfahren
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server wird heruntergefahren'));
    });

    while (true) {
        // Anfragen verarbeiten...
    }
});
?>
```

## Hinweise

> **Hinweis:** Coroutinen, die **nach** dem Aufruf von `graceful_shutdown()` erstellt werden, werden sofort abgebrochen.

> **Hinweis:** `exit` und `die` loesen automatisch ein kontrolliertes Herunterfahren aus.

## Siehe auch

- [Cancellation](/de/docs/components/cancellation.html) — Abbruchmechanismus
- [Scope](/de/docs/components/scope.html) — Lebenszyklus-Verwaltung
