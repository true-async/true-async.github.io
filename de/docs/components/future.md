---
layout: docs
lang: de
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /de/docs/components/future.html
page_title: "Future"
description: "Future in TrueAsync -- ein Ergebnisversprechen, Transformationsketten map/catch/finally, FutureState und Diagnostik."
---

# Future: Ein Ergebnisversprechen

## Was ist Future

`Async\Future` ist ein Objekt, das das Ergebnis einer Operation darstellt, die möglicherweise noch nicht abgeschlossen ist.
Future ermöglicht es Ihnen:

- Das Ergebnis über `await()` oder `$future->await()` abzuwarten
- Transformationsketten über `map()`, `catch()`, `finally()` aufzubauen
- Die Operation über `cancel()` abzubrechen
- Bereits abgeschlossene Futures über statische Fabrikmethoden zu erstellen

Future ist vergleichbar mit `Promise` in JavaScript, jedoch integriert mit TrueAsync-Koroutinen.

## Future und FutureState

Future ist in zwei Klassen mit klarer Aufgabentrennung unterteilt:

- **`FutureState`** -- ein veränderbarer Container, über den das Ergebnis geschrieben wird
- **`Future`** -- ein schreibgeschützter Wrapper, über den das Ergebnis gelesen und transformiert wird

```php
<?php
use Async\Future;
use Async\FutureState;

// FutureState erstellen -- er besitzt den Zustand
$state = new FutureState();

// Future erstellen -- es bietet Zugriff auf das Ergebnis
$future = new Future($state);

// $future an den Konsumenten übergeben
// $state an den Produzenten übergeben

// Der Produzent schließt die Operation ab
$state->complete(42);

// Der Konsument erhält das Ergebnis
$result = $future->await(); // 42
?>
```

Diese Trennung garantiert, dass der Konsument das Future nicht versehentlich abschließen kann -- nur der Inhaber von `FutureState` hat dieses Recht.

## Future erstellen

### Über FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// In einer anderen Koroutine abschließen
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Statische Fabrikmethoden

Zum Erstellen bereits abgeschlossener Futures:

```php
<?php
use Async\Future;

// Erfolgreich abgeschlossenes Future
$future = Future::completed(42);
$result = $future->await(); // 42

// Future mit einem Fehler
$future = Future::failed(new \RuntimeException('Etwas ist schiefgelaufen'));
$result = $future->await(); // wirft RuntimeException
?>
```

## Transformationsketten

Future unterstützt drei Transformationsmethoden, die ähnlich wie Promise in JavaScript funktionieren:

### map() -- Ergebnis transformieren

Wird nur bei erfolgreichem Abschluss aufgerufen. Gibt ein neues Future mit dem transformierten Ergebnis zurück:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Ergebnis: $value");

$state->complete(21);

echo $asString->await(); // "Ergebnis: 42"
?>
```

### catch() -- Fehlerbehandlung

Wird nur bei einem Fehler aufgerufen. Ermöglicht die Wiederherstellung nach einer Ausnahme:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Standardwert';
});

$state->error(new \RuntimeException('Fehler'));

echo $safe->await(); // "Standardwert"
?>
```

### finally() -- Ausführung bei jedem Ergebnis

Wird immer aufgerufen -- sowohl bei Erfolg als auch bei einem Fehler. Das Ergebnis des übergeordneten Futures wird unverändert an das Kind weitergegeben:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Ressourcen freigeben
    echo "Operation abgeschlossen\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (Ergebnis wird unverändert weitergegeben)
?>
```

### Zusammengesetzte Ketten

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Unbekannt')
    ->catch(fn(\Throwable $e) => 'Fehler: ' . $e->getMessage())
    ->finally(function($value) {
        // Protokollierung
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Unabhängige Abonnenten

Jeder Aufruf von `map()` auf demselben Future erstellt eine **unabhängige** Kette. Abonnenten beeinflussen sich nicht gegenseitig:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Zwei unabhängige Ketten vom selben Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Fehlerweiterleitung in Ketten

Wenn das Quell-Future mit einem Fehler abschließt, wird `map()` **übersprungen** und der Fehler direkt an `catch()` weitergeleitet:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "Dieser Code wird nicht ausgeführt\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Wiederhergestellt: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Quellfehler'));

echo await($result) . "\n"; // "Wiederhergestellt: Quellfehler"
?>
```

Wenn eine Ausnahme **innerhalb** von `map()` auftritt, wird sie vom nachfolgenden `catch()` abgefangen:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Fehler in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Abgefangen: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Abgefangen: Fehler in map"
?>
```

## Ergebnis abwarten

### Über die Funktion await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Über die Methode $future->await()

```php
<?php
$result = $future->await();

// Mit Abbruch-Timeout
$result = $future->await(Async\timeout(5000));
```

## Future abbrechen

```php
<?php
use Async\AsyncCancellation;

// Mit Standardnachricht abbrechen
$future->cancel();

// Mit einem benutzerdefinierten Fehler abbrechen
$future->cancel(new AsyncCancellation('Operation wird nicht mehr benötigt'));
```

## Warnungen unterdrücken: ignore()

Wenn ein Future nicht verwendet wird (weder `await()`, `map()`, `catch()` noch `finally()` wurde aufgerufen), gibt TrueAsync eine Warnung aus.
Um diese Warnung explizit zu unterdrücken:

```php
<?php
$future->ignore();
```

Wenn ein Future mit einem Fehler abgeschlossen wurde und dieser Fehler nicht behandelt wurde, warnt TrueAsync ebenfalls. `ignore()` unterdrückt auch diese Warnung.

## FutureState: Operation abschließen

### complete() -- Erfolgreicher Abschluss

```php
<?php
$state->complete($result);
```

### error() -- Abschluss mit einem Fehler

```php
<?php
$state->error(new \RuntimeException('Fehler'));
```

### Einschränkungen

- `complete()` und `error()` können nur **einmal** aufgerufen werden. Ein erneuter Aufruf wirft `AsyncException`.
- Nach dem Aufruf von `complete()` oder `error()` ist der Zustand des Futures unveränderlich.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState ist bereits abgeschlossen
```

## Diagnostik

Beide Klassen (`Future` und `FutureState`) bieten Diagnosemethoden:

```php
<?php
// Zustand prüfen
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Wo das Future erstellt wurde
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Wo das Future abgeschlossen wurde
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" oder "unknown"

// Warte-Informationen
$future->getAwaitingInfo(); // array
```

## Praxisbeispiel: HTTP-Client

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Verwendung
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## Siehe auch

- [await()](/de/docs/reference/await.html) -- Abschluss abwarten
- [Koroutinen](/de/docs/components/coroutines.html) -- die grundlegende Einheit der Nebenläufigkeit
- [Cancellation](/de/docs/components/cancellation.html) -- der Abbruchmechanismus
