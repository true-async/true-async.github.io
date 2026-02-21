---
layout: docs
lang: de
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /de/docs/reference/signal.html
page_title: "signal()"
description: "signal() — auf ein Betriebssystem-Signal warten mit Abbruchunterstuetzung ueber Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Wartet auf ein Betriebssystem-Signal. Gibt ein `Future` zurueck, das mit einem `Signal`-Wert aufgeloest wird, wenn das Signal empfangen wird.

## Beschreibung

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Erstellt einen einmaligen Betriebssystem-Signal-Handler. Jeder Aufruf von `signal()` erstellt ein neues `Future`, das beim ersten Empfang des angegebenen Signals aufgeloest wird.
Wenn der Parameter `$cancellation` angegeben wird, wird das `Future` abgelehnt, wenn der Abbruch ausgeloest wird (z.B. bei Timeout).

Mehrere Aufrufe von `signal()` mit demselben Signal arbeiten unabhaengig voneinander — jeder erhaelt eine Benachrichtigung.

## Parameter

**`signal`**
Ein `Async\Signal`-Enum-Wert, der das erwartete Signal angibt. Zum Beispiel: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Ein optionales Objekt, das `Async\Completable` implementiert (z.B. ein Ergebnis von `timeout()`). Wenn das Abbruchobjekt vor dem Eintreffen des Signals ausgeloest wird, wird das `Future` mit der entsprechenden Ausnahme abgelehnt (z.B. `Async\TimeoutException`).

Wenn das Abbruchobjekt zum Zeitpunkt des Aufrufs bereits abgeschlossen ist, gibt `signal()` sofort ein abgelehntes `Future` zurueck.

## Rueckgabewerte

Gibt `Async\Future<Async\Signal>` zurueck. Wenn das Signal empfangen wird, wird das `Future` mit dem `Async\Signal`-Enum-Wert aufgeloest, der dem empfangenen Signal entspricht.

## Fehler/Ausnahmen

- `Async\TimeoutException` — wenn der Timeout vor dem Empfang des Signals ausgeloest wurde.
- `Async\AsyncCancellation` — wenn der Abbruch aus einem anderen Grund erfolgte.

## Beispiele

### Beispiel #1 Auf ein Signal mit Timeout warten

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Signal empfangen: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Signal nicht innerhalb von 5 Sekunden empfangen\n";
}
?>
```

### Beispiel #2 Signal von einer anderen Coroutine empfangen

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Signal empfangen: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Beispiel #3 Kontrolliertes Herunterfahren bei SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM empfangen, fahre herunter...\n";
    graceful_shutdown();
});
?>
```

### Beispiel #4 Bereits abgelaufener Timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Timeout ist bereits abgelaufen

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Hinweise

> **Hinweis:** Jeder Aufruf von `signal()` erstellt einen **einmaligen** Handler. Um erneut auf dasselbe Signal zu warten, rufen Sie `signal()` erneut auf.

> **Hinweis:** `Signal::SIGINT` und `Signal::SIGBREAK` funktionieren auf allen Plattformen, einschliesslich Windows. Signale wie `SIGUSR1`, `SIGUSR2` und andere POSIX-Signale sind nur auf Unix-Systemen verfuegbar.

> **Hinweis:** `Signal::SIGKILL` und `Signal::SIGSEGV` koennen nicht abgefangen werden — dies ist eine Einschraenkung des Betriebssystems.

## Signal

Das `Async\Signal`-Enum definiert die verfuegbaren Betriebssystem-Signale:

| Wert | Signal | Beschreibung |
|------|--------|--------------|
| `Signal::SIGHUP` | 1 | Terminalverbindung verloren |
| `Signal::SIGINT` | 2 | Interrupt (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Beenden mit Core-Dump |
| `Signal::SIGILL` | 4 | Ungueltiger Befehl |
| `Signal::SIGABRT` | 6 | Abnormale Beendigung |
| `Signal::SIGFPE` | 8 | Gleitkomma-Arithmetikfehler |
| `Signal::SIGKILL` | 9 | Bedingungslose Beendigung |
| `Signal::SIGUSR1` | 10 | Benutzerdefiniertes Signal 1 |
| `Signal::SIGSEGV` | 11 | Speicherzugriffsverletzung |
| `Signal::SIGUSR2` | 12 | Benutzerdefiniertes Signal 2 |
| `Signal::SIGTERM` | 15 | Beendigungsanforderung |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Abnormale Beendigung (Alternative) |
| `Signal::SIGWINCH` | 28 | Terminal-Fenstergroesse geaendert |

## Siehe auch

- [timeout()](/de/docs/reference/timeout.html) — ein Timeout erstellen, um die Wartezeit zu begrenzen
- [await()](/de/docs/reference/await.html) — Warten auf ein Future-Ergebnis
- [graceful_shutdown()](/de/docs/reference/graceful-shutdown.html) — kontrolliertes Herunterfahren des Schedulers
- [Cancellation](/de/docs/components/cancellation.html) — Abbruchmechanismus
