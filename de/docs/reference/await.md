---
layout: docs
lang: de
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /de/docs/reference/await.html
page_title: "await()"
description: "await() — Warten auf den Abschluss einer Coroutine oder eines Future. Vollstaendige Dokumentation: Parameter, Ausnahmen, Beispiele."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Wartet auf den Abschluss einer Coroutine, eines `Async\Future` oder eines anderen `Async\Completable`.
Gibt das Ergebnis zurueck oder wirft eine Ausnahme.

## Beschreibung

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Unterbricht die Ausfuehrung der aktuellen Coroutine, bis das angegebene `Async\Completable` `$awaitable` abgeschlossen ist (oder bis `$cancellation` ausgeloest wird, falls angegeben) und gibt das Ergebnis zurueck.
Wenn das `awaitable` bereits abgeschlossen ist, wird das Ergebnis sofort zurueckgegeben.

Wenn die Coroutine mit einer Ausnahme beendet wurde, wird diese an den aufrufenden Code weitergegeben.

## Parameter

**`awaitable`**
Ein Objekt, das das `Async\Completable`-Interface implementiert (erweitert `Async\Awaitable`). Typischerweise ist dies:
- `Async\Coroutine` - das Ergebnis eines `spawn()`-Aufrufs
- `Async\TaskGroup` - eine Aufgabengruppe
- `Async\Future` - ein zukuenftiger Wert

**`cancellation`**
Ein optionales `Async\Completable`-Objekt; wenn es abgeschlossen wird, wird das Warten abgebrochen.

## Rueckgabewerte

Gibt den Wert zurueck, den die Coroutine zurueckgegeben hat. Der Rueckgabetyp haengt von der Coroutine ab.

## Fehler/Ausnahmen

Wenn die Coroutine mit einer Ausnahme beendet wurde, wirft `await()` diese Ausnahme erneut.

Wenn die Coroutine abgebrochen wurde, wird `Async\AsyncCancellation` geworfen.

## Beispiele

### Beispiel #1 Grundlegende Verwendung von await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hallo, Async!";
});

echo await($coroutine); // Hallo, Async!
?>
```

### Beispiel #2 Sequentielles Warten

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "Benutzer: {$user['name']}\n";
echo "Beitraege: " . count($posts) . "\n";
?>
```

### Beispiel #3 Ausnahmebehandlung

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Daten konnten nicht abgerufen werden");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Daten empfangen\n";
} catch (RuntimeException $e) {
    echo "Fehler: " . $e->getMessage() . "\n";
}
?>
```

### Beispiel #4 await mit TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Ergebnis 1";
});

$taskGroup->spawn(function() {
    return "Ergebnis 2";
});

$taskGroup->spawn(function() {
    return "Ergebnis 3";
});

// Array aller Ergebnisse abrufen
$results = await($taskGroup);
print_r($results); // Array der Ergebnisse
?>
```

### Beispiel #5 Mehrfaches await auf dieselbe Coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Fertig";
});

// Das erste await wartet auf das Ergebnis
$result1 = await($coroutine);
echo "$result1\n";

// Nachfolgende awaits geben das Ergebnis sofort zurueck
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Beispiel #6 await innerhalb einer Coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Eltern-Coroutine gestartet\n";

    $child = spawn(function() {
        echo "Kind-Coroutine laeuft\n";
        Async\sleep(1000);
        return "Ergebnis vom Kind";
    });

    echo "Warte auf Kind...\n";
    $result = await($child);
    echo "Empfangen: $result\n";
});

echo "Hauptcode wird fortgesetzt\n";
?>
```

## Changelog

| Version  | Beschreibung                          |
|----------|---------------------------------------|
| 1.0.0    | Funktion `await()` hinzugefuegt     |

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) - Starten einer Coroutine
- [suspend()](/de/docs/reference/suspend.html) - Unterbrechen der Ausfuehrung
