---
layout: docs
lang: de
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /de/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — ein dynamisches Task-Set mit automatischer Ergebnisbereinigung nach der Auslieferung."
---

# Die Klasse Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Einleitung

`TaskGroup` eignet sich hervorragend für Szenarien, in denen es um die Ergebnisse geht und nicht um die Tasks selbst.
Es gibt jedoch viele Situationen, in denen die Anzahl der Tasks kontrolliert werden muss,
während die Ergebnisse als Stream konsumiert werden.

Typische Beispiele:

- **Supervisor**: Code, der Tasks überwacht und auf deren Abschluss reagiert.
- **Coroutine-Pool**: Eine feste Anzahl von Coroutinen, die Daten verarbeiten.

**TaskSet** wurde entwickelt, um diese Probleme zu lösen. Es entfernt abgeschlossene Tasks
automatisch bei der Ergebnisauslieferung über `joinNext()`, `joinAll()`, `joinAny()` oder `foreach`.

## Unterschiede zu TaskGroup

| Eigenschaft              | TaskGroup                          | TaskSet                                    |
|--------------------------|------------------------------------|--------------------------------------------|
| Ergebnisspeicherung      | Alle Ergebnisse bis zur expliziten Abfrage | Nach Auslieferung entfernt            |
| Wiederholte Methodenaufrufe | Idempotent — gleiches Ergebnis  | Jeder Aufruf — nächstes Element            |
| `count()`                | Gesamtanzahl der Tasks             | Anzahl nicht ausgelieferter Tasks          |
| Wartemethoden            | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`     |
| Iteration                | Einträge bleiben erhalten          | Einträge werden nach `foreach` entfernt    |
| Anwendungsfall           | Feste Menge von Tasks              | Dynamischer Task-Stream                    |

## Idempotenz vs. Konsumierung

**Der zentrale konzeptuelle Unterschied** zwischen `TaskSet` und `TaskGroup`.

**TaskGroup ist idempotent.** Aufrufe von `race()`, `any()`, `all()` liefern stets
dasselbe Ergebnis. Die Iteration über `foreach` durchläuft immer alle Tasks.
Ergebnisse werden in der Gruppe gespeichert und sind wiederholt abrufbar:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() liefert immer denselben zuerst abgeschlossenen Task
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — dasselbe Ergebnis!

// all() liefert immer das vollständige Array
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — dasselbe Array!

// foreach durchläuft immer alle Elemente
foreach ($group as $key => [$result, $error]) { /* 3 Iterationen */ }
foreach ($group as $key => [$result, $error]) { /* erneut 3 Iterationen */ }

echo $group->count(); // 3 — immer 3
```

**TaskSet ist konsumierend.** Jeder Aufruf von `joinNext()` / `joinAny()` entnimmt
das nächste Element und entfernt es aus dem Set. Ein erneuter `foreach` findet
bereits ausgelieferte Einträge nicht mehr. Dieses Verhalten ist vergleichbar mit dem Lesen aus einer Queue oder einem Channel:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() liefert jedes Mal das NÄCHSTE Ergebnis
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — anderes Ergebnis!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — Set ist leer

// joinAll() nach vollständiger Konsumierung — leeres Array
$set->seal();
$rest = $set->joinAll()->await(); // [] — nichts mehr vorhanden
```

Dieselbe Logik gilt auch für die Iteration:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// Erstes foreach konsumiert alle Ergebnisse
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Zweites foreach — leer, nichts zu iterieren
foreach ($set as $key => [$result, $error]) {
    echo "wird nicht ausgeführt\n";
}
```

> **Regel:** Wenn Sie wiederholt auf Ergebnisse zugreifen müssen — verwenden Sie `TaskGroup`.
> Wenn Ergebnisse einmalig verarbeitet werden und Speicher freigeben sollen — verwenden Sie `TaskSet`.

## Semantik der Join-Methoden

Im Gegensatz zu `TaskGroup`, wo `race()` / `any()` / `all()` die Einträge in der Gruppe belassen,
verwendet `TaskSet` Methoden mit **Join**-Semantik — Ergebnis ausgeliefert, Eintrag entfernt:

- **`joinNext()`** — Analogon zu `race()`: Ergebnis des ersten abgeschlossenen Tasks (Erfolg oder Fehler),
  der Eintrag wird aus dem Set entfernt.
- **`joinAny()`** — Analogon zu `any()`: Ergebnis des ersten *erfolgreich* abgeschlossenen Tasks,
  der Eintrag wird aus dem Set entfernt. Fehler werden übersprungen.
- **`joinAll()`** — Analogon zu `all()`: Array aller Ergebnisse,
  alle Einträge werden aus dem Set entfernt.

## Automatische Bereinigung

Die automatische Bereinigung greift an allen Punkten der Ergebnisauslieferung:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

Bei der Iteration über `foreach` wird jeder verarbeitete Eintrag sofort entfernt:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() verringert sich mit jeder Iteration
    process($result);
}
```

## Nebenläufigkeitslimit

Wie `TaskGroup` unterstützt auch `TaskSet` eine Begrenzung der Nebenläufigkeit:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Tasks, die das Limit überschreiten, werden in eine Warteschlange eingereiht und gestartet, sobald ein Slot frei wird.

## Klassenübersicht

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Methoden */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Tasks hinzufügen */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Auf Ergebnisse warten (mit automatischer Bereinigung) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Lebenszyklus */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Zustand */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Auf Abschluss warten */
    public awaitCompletion(): void

    /* Iteration (mit automatischer Bereinigung) */
    public getIterator(): Iterator
}
```

## Beispiele

### joinAll() — paralleles Laden mit automatischer Bereinigung

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, alle Einträge entfernt

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — Tasks verarbeiten, sobald sie fertig sind

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Ergebnis erhalten, verbleibend: {$set->count()}\n";
}
```

### joinAny() — fehlertolerante Suche

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Erstes erfolgreiches Ergebnis, Eintrag entfernt
$result = $set->joinAny()->await();
echo "Gefunden, aktive Tasks: {$set->count()}\n";
```

### foreach — Stream-Verarbeitung

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Fehler bei der Verarbeitung von $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Eintrag entfernt, Speicher freigegeben
}
```

### Worker-Schleife mit dynamischem Hinzufügen von Tasks

```php
$set = new Async\TaskSet(concurrency: 10);

// Eine Coroutine fügt Tasks hinzu
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Eine andere verarbeitet die Ergebnisse
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Fehler: {$error->getMessage()}");
        }
    }
});
```

## Entsprechungen in anderen Sprachen

| Funktion               | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|------------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Dynamisches Set        | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Automatische Bereinigung | Automatisch                     | Manuelle Verwaltung           | Manuelle Verwaltung       | Manuelle Verwaltung    |
| Nebenläufigkeitslimit  | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Gepufferter Channel    |
| Stream-Iteration       | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Inhalt

- [TaskSet::__construct](/de/docs/reference/task-set/construct.html) — Ein Task-Set erstellen
- [TaskSet::spawn](/de/docs/reference/task-set/spawn.html) — Einen Task mit automatischem Schlüssel hinzufügen
- [TaskSet::spawnWithKey](/de/docs/reference/task-set/spawn-with-key.html) — Einen Task mit explizitem Schlüssel hinzufügen
- [TaskSet::joinNext](/de/docs/reference/task-set/join-next.html) — Ergebnis des ersten abgeschlossenen Tasks abrufen
- [TaskSet::joinAny](/de/docs/reference/task-set/join-any.html) — Ergebnis des ersten erfolgreichen Tasks abrufen
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Auf alle Tasks warten und Ergebnisse abrufen
- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set für neue Tasks versiegeln
- [TaskSet::cancel](/de/docs/reference/task-set/cancel.html) — Alle Tasks abbrechen
- [TaskSet::dispose](/de/docs/reference/task-set/dispose.html) — Den Scope des Sets zerstören
- [TaskSet::finally](/de/docs/reference/task-set/finally.html) — Einen Abschluss-Handler registrieren
- [TaskSet::isFinished](/de/docs/reference/task-set/is-finished.html) — Prüfen, ob alle Tasks abgeschlossen sind
- [TaskSet::isSealed](/de/docs/reference/task-set/is-sealed.html) — Prüfen, ob das Set versiegelt ist
- [TaskSet::count](/de/docs/reference/task-set/count.html) — Anzahl der nicht ausgelieferten Tasks abrufen
- [TaskSet::awaitCompletion](/de/docs/reference/task-set/await-completion.html) — Auf den Abschluss aller Tasks warten
- [TaskSet::getIterator](/de/docs/reference/task-set/get-iterator.html) — Ergebnisse mit automatischer Bereinigung iterieren
