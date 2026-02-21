---
layout: docs
lang: de
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /de/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- ein High-Level-Muster für strukturierte Nebenläufigkeit zur Verwaltung von Aufgabengruppen."
---

# Die Klasse Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Einführung

Bei der Arbeit mit Coroutinen muss man häufig mehrere Aufgaben starten und auf deren Ergebnisse warten.
Bei direkter Verwendung von `spawn()` und `await()` übernimmt der Entwickler die Verantwortung dafür,
dass jede Coroutine entweder abgewartet oder abgebrochen wird. Eine vergessene Coroutine läuft weiter,
ein unbehandelter Fehler geht verloren, und das Abbrechen einer Aufgabengruppe erfordert manuellen Code.

Die Funktionen `await_all()` und `await_any()` berücksichtigen keine logischen Beziehungen zwischen verschiedenen Aufgaben.
Wenn Sie beispielsweise mehrere Anfragen stellen, das erste Ergebnis nehmen und den Rest abbrechen müssen,
erfordert `await_any()` zusätzlichen Code vom Programmierer, um die verbleibenden Aufgaben abzubrechen.
Solcher Code kann recht komplex sein, daher sollten `await_all()` und `await_any()` in dieser Situation
als Anti-Patterns betrachtet werden.

Die Verwendung von `Scope` für diesen Zweck ist nicht geeignet, da Aufgaben-Coroutinen andere Kind-Coroutinen erstellen können,
was den Programmierer dazu zwingt, eine Liste von Aufgaben-Coroutinen zu pflegen und separat zu verfolgen.

**TaskGroup** löst all diese Probleme. Es ist ein High-Level-Muster für strukturierte Nebenläufigkeit,
das garantiert: Alle Aufgaben werden korrekt abgewartet oder abgebrochen. Es gruppiert Aufgaben logisch
und ermöglicht es, sie als eine Einheit zu behandeln.

## Wartestrategien

`TaskGroup` bietet mehrere Strategien zum Warten auf Ergebnisse.
Jede gibt ein `Future` zurück, das die Übergabe eines Timeouts ermöglicht: `->await(Async\timeout(5.0))`.

- **`all()`** -- gibt ein `Future` zurück, das mit einem Array aller Aufgabenergebnisse aufgelöst wird,
  oder mit `CompositeException` ablehnt, wenn mindestens eine Aufgabe eine Ausnahme geworfen hat.
  Mit dem Parameter `ignoreErrors: true` werden nur erfolgreiche Ergebnisse zurückgegeben.
- **`race()`** -- gibt ein `Future` zurück, das mit dem Ergebnis der ersten abgeschlossenen Aufgabe aufgelöst wird,
  unabhängig davon, ob sie erfolgreich abgeschlossen wurde oder nicht. Andere Aufgaben laufen weiter.
- **`any()`** -- gibt ein `Future` zurück, das mit dem Ergebnis der ersten *erfolgreich* abgeschlossenen Aufgabe aufgelöst wird,
  wobei Fehler ignoriert werden. Wenn alle Aufgaben fehlgeschlagen sind -- lehnt es mit `CompositeException` ab.
- **`awaitCompletion()`** -- wartet auf den vollständigen Abschluss aller Aufgaben sowie anderer Coroutinen im `Scope`.

## Nebenläufigkeitslimit

Wenn der Parameter `concurrency` angegeben wird, funktioniert `TaskGroup` als Coroutine-Pool:
Aufgaben, die das Limit überschreiten, warten in einer Warteschlange und erstellen keine Coroutine, bis ein freier Platz verfügbar ist.
Das spart Speicher und kontrolliert die Last bei der Verarbeitung einer großen Anzahl von Aufgaben.

## TaskGroup und Scope

`TaskGroup` verwendet `Scope` für die Verwaltung des Lebenszyklus von Aufgaben-Coroutinen.
Beim Erstellen einer `TaskGroup` können Sie einen bestehenden `Scope` übergeben oder `TaskGroup` einen Kind-`Scope` vom aktuellen erstellen lassen.
Alle zu `TaskGroup` hinzugefügten Aufgaben werden innerhalb dieses `Scopes` ausgeführt.
Das bedeutet, dass beim Abbruch oder der Zerstörung von `TaskGroup`
alle Coroutinen automatisch abgebrochen werden, was sichere Ressourcenverwaltung gewährleistet und Leaks verhindert.

## Versiegelung und Iteration

`TaskGroup` ermöglicht das dynamische Hinzufügen von Aufgaben, bis sie
mit der Methode `seal()` versiegelt wird.

Die Methode `all()` gibt ein `Future` zurück, das ausgelöst wird, wenn alle bestehenden Aufgaben
in der Warteschlange abgeschlossen sind. Dies ermöglicht die Verwendung von `TaskGroup` in einer Schleife, in der Aufgaben dynamisch hinzugefügt werden,
und `all()` aufgerufen wird, um Ergebnisse der aktuellen Aufgabenmenge zu erhalten.

`TaskGroup` unterstützt auch `foreach` zur Iteration über Ergebnisse, sobald sie bereit sind.
In diesem Fall muss `seal()` nach dem Hinzufügen aller Aufgaben aufgerufen werden, um zu signalisieren, dass
es keine neuen Aufgaben mehr geben wird, und `foreach` nach der Verarbeitung aller Ergebnisse beendet werden kann.

## Klassenübersicht

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Methoden */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Aufgaben hinzufügen */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Auf Ergebnisse warten */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Lebenszyklus */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Zustand */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Ergebnisse und Fehler */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Iteration */
    public getIterator(): Iterator
}
```

## Beispiele

### all() -- Paralleles Laden von Daten

Das häufigste Szenario -- gleichzeitiges Laden von Daten aus mehreren Quellen:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Alle drei Anfragen werden parallel ausgeführt. Wenn eine davon eine Ausnahme wirft,
gibt `all()` ein `Future` zurück, das mit `CompositeException` ablehnt.

### race() -- Hedged Requests

Das "Hedged Request"-Muster -- dieselbe Anfrage an mehrere Repliken senden
und die erste Antwort nehmen. Das reduziert die Latenz bei langsamen oder überlasteten Servern:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// Erste Antwort ist das Ergebnis, andere Aufgaben laufen weiter
$product = $group->race()->await();
```

### any() -- Fehlertolerante Suche

Mehrere Anbieter abfragen, die erste erfolgreiche Antwort nehmen, Fehler ignorieren:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ignoriert fehlgeschlagene Anbieter und gibt das erste erfolgreiche Ergebnis zurück
$results = $group->any()->await();

// Fehler von fehlgeschlagenen Anbietern müssen explizit behandelt werden, sonst wirft der Destruktor eine Ausnahme
$group->suppressErrors();
```

Wenn alle Anbieter fehlgeschlagen sind, wirft `any()` eine `CompositeException` mit allen Fehlern.

### Nebenläufigkeitslimit -- Verarbeitung einer Warteschlange

10.000 Aufgaben verarbeiten, aber nicht mehr als 50 gleichzeitig:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` reiht Aufgaben automatisch in eine Warteschlange ein. Eine Coroutine wird erst erstellt, wenn
ein freier Platz verfügbar ist, was bei großen Aufgabenmengen Speicher spart.

### Iteration über Ergebnisse bei Abschluss

Ergebnisse verarbeiten, ohne auf den Abschluss aller Aufgaben zu warten:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Ergebnisse treffen ein, sobald sie bereit sind, nicht in der Reihenfolge des Hinzufügens
    saveToStorage($result);
}
```

### Timeout für eine Aufgabengruppe

Die Wartezeit für Ergebnisse begrenzen:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Daten konnten nicht innerhalb von 5 Sekunden abgerufen werden";
}
```

## Analoga in anderen Sprachen

| Fähigkeit               | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Strukturierte Nebenläufigkeit | `seal()` + `all()->await()`    | `async with`-Block              | `try-with-resources` + `join()`          | Automatisch via Scope     |
| Wartestrategien         | `all()`, `race()`, `any()` -> Future | Nur all (via `async with`)      | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Nebenläufigkeitslimit   | `concurrency: N`                    | Nein (braucht `Semaphore`)      | Nein                                     | Nein (braucht `Semaphore`)|
| Ergebnisiteration       | `foreach` bei Abschluss             | Nein                            | Nein                                     | `Channel`                 |
| Fehlerbehandlung        | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | Ausnahme bricht Scope ab  |

PHP `TaskGroup` kombiniert Fähigkeiten, die in anderen Sprachen auf mehrere Primitive verteilt sind:
Nebenläufigkeitsbegrenzung ohne Semaphore, mehrere Wartestrategien in einem einzelnen Objekt und Ergebnisiteration bei Abschluss.

## Inhalt

- [TaskGroup::__construct](/de/docs/reference/task-group/construct.html) -- Aufgabengruppe erstellen
- [TaskGroup::spawn](/de/docs/reference/task-group/spawn.html) -- Aufgabe mit Auto-Increment-Schlüssel hinzufügen
- [TaskGroup::spawnWithKey](/de/docs/reference/task-group/spawn-with-key.html) -- Aufgabe mit explizitem Schlüssel hinzufügen
- [TaskGroup::all](/de/docs/reference/task-group/all.html) -- Auf alle Aufgaben warten und Ergebnisse abrufen
- [TaskGroup::race](/de/docs/reference/task-group/race.html) -- Ergebnis der ersten abgeschlossenen Aufgabe abrufen
- [TaskGroup::any](/de/docs/reference/task-group/any.html) -- Ergebnis der ersten erfolgreichen Aufgabe abrufen
- [TaskGroup::awaitCompletion](/de/docs/reference/task-group/await-completion.html) -- Auf Abschluss aller Aufgaben warten
- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) -- Gruppe für neue Aufgaben versiegeln
- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) -- Alle Aufgaben abbrechen
- [TaskGroup::dispose](/de/docs/reference/task-group/dispose.html) -- Scope der Gruppe zerstören
- [TaskGroup::finally](/de/docs/reference/task-group/finally.html) -- Abschlusshandler registrieren
- [TaskGroup::isFinished](/de/docs/reference/task-group/is-finished.html) -- Prüfen, ob alle Aufgaben abgeschlossen sind
- [TaskGroup::isSealed](/de/docs/reference/task-group/is-sealed.html) -- Prüfen, ob die Gruppe versiegelt ist
- [TaskGroup::count](/de/docs/reference/task-group/count.html) -- Anzahl der Aufgaben abrufen
- [TaskGroup::getResults](/de/docs/reference/task-group/get-results.html) -- Array erfolgreicher Ergebnisse abrufen
- [TaskGroup::getErrors](/de/docs/reference/task-group/get-errors.html) -- Array der Fehler abrufen
- [TaskGroup::suppressErrors](/de/docs/reference/task-group/suppress-errors.html) -- Fehler als behandelt markieren
- [TaskGroup::getIterator](/de/docs/reference/task-group/get-iterator.html) -- Über Ergebnisse iterieren, sobald sie abgeschlossen sind
