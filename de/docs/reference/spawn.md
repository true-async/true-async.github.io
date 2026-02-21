---
layout: docs
lang: de
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /de/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — eine Funktion in einer neuen Coroutine starten. Vollstaendige Dokumentation: Parameter, Rueckgabewert, Beispiele."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Startet eine Funktion zur Ausfuehrung in einer neuen Coroutine. Erstellt eine Coroutine.

## Beschreibung

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Erstellt und startet eine neue Coroutine. Die Coroutine wird asynchron ausgefuehrt.

## Parameter

**`callback`**
Eine Funktion oder Closure, die in der Coroutine ausgefuehrt werden soll. Kann jeder gueltige Callable-Typ sein.

**`args`**
Optionale Parameter, die an `callback` uebergeben werden. Parameter werden als Wert uebergeben.

## Rueckgabewerte

Gibt ein `Async\Coroutine`-Objekt zurueck, das die gestartete Coroutine repraesentiert. Das Objekt kann verwendet werden, um:
- Das Ergebnis ueber `await()` zu erhalten
- Die Ausfuehrung ueber `cancel()` abzubrechen
- Den Zustand der Coroutine zu pruefen

## Beispiele

### Beispiel #1 Grundlegende Verwendung von spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// Die Coroutine wird asynchron ausgefuehrt
echo "Coroutine gestartet\n";

$result = await($coroutine);
echo "Ergebnis empfangen\n";
?>
```

### Beispiel #2 Mehrere Coroutinen

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// Alle Anfragen werden nebenlaeufig ausgefuehrt
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Heruntergeladen: " . strlen($content) . " Bytes\n";
}
?>
```

### Beispiel #3 Verwendung mit einer Closure

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Beispiel #4 spawn mit Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// Auf den Abschluss aller Coroutinen im Scope warten
$scope->awaitCompletion();
?>
```

### Beispiel #5 Parameter uebergeben

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Summe: $result\n"; // Summe: 60
?>
```

### Beispiel #6 Fehlerbehandlung

Eine Moeglichkeit, eine Ausnahme einer Coroutine zu behandeln, ist die Verwendung der Funktion `await()`:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Zufaelliger Fehler");
    }
    return "Erfolg";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Fehler: " . $e->getMessage();
}
?>
```

## Hinweise

> **Hinweis:** Ueber `spawn()` erstellte Coroutinen werden nebenlaeufig, aber nicht parallel ausgefuehrt.
> PHP TrueAsync verwendet ein Single-Thread-Ausfuehrungsmodell.

> **Hinweis:** Parameter werden als Wert an die Coroutine uebergeben.
> Um per Referenz zu uebergeben, verwenden Sie eine Closure mit `use (&$var)`.

## Changelog

| Version  | Beschreibung                          |
|----------|---------------------------------------|
| 1.0.0    | Funktion `spawn()` hinzugefuegt     |

## Siehe auch

- [await()](/de/docs/reference/await.html) - Warten auf ein Coroutine-Ergebnis
- [suspend()](/de/docs/reference/suspend.html) - Unterbrechen der Coroutine-Ausfuehrung
