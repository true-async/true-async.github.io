---
layout: docs
lang: de
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /de/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "Die Klasse Async\\Coroutine -- Erstellung, Lebenszyklus, Zustände, Abbruch, Debugging und vollständige Methodenreferenz."
---

# Die Klasse Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Coroutinen in TrueAsync

Wenn eine reguläre Funktion eine I/O-Operation wie `fread` oder `fwrite` aufruft (eine Datei lesen oder eine Netzwerkanfrage senden),
wird die Kontrolle an den Betriebssystemkernel übergeben, und `PHP` blockiert, bis die Operation abgeschlossen ist.

Wenn eine Funktion jedoch innerhalb einer Coroutine ausgeführt wird und eine I/O-Operation aufruft,
blockiert nur die Coroutine, nicht der gesamte `PHP`-Prozess.
Währenddessen wird die Kontrolle an eine andere Coroutine übergeben, falls eine existiert.

In diesem Sinne sind Coroutinen Betriebssystem-Threads sehr ähnlich,
aber sie werden im Benutzerraum verwaltet und nicht vom Betriebssystemkernel.

Ein weiterer wichtiger Unterschied ist, dass Coroutinen die CPU-Zeit abwechselnd teilen
und die Kontrolle freiwillig abgeben, während Threads jederzeit unterbrochen werden können.

TrueAsync-Coroutinen werden innerhalb eines einzelnen Threads ausgeführt
und sind nicht parallel. Dies führt zu mehreren wichtigen Konsequenzen:
- Variablen können frei aus verschiedenen Coroutinen gelesen und modifiziert werden, ohne Sperren, da sie nicht gleichzeitig ausgeführt werden.
- Coroutinen können nicht gleichzeitig mehrere CPU-Kerne nutzen.
- Wenn eine Coroutine eine lange synchrone Operation ausführt, blockiert sie den gesamten Prozess, da sie die Kontrolle nicht an andere Coroutinen abgibt.

## Erstellen einer Coroutine

Eine Coroutine wird mit der Funktion `spawn()` erstellt:

```php
use function Async\spawn;

// Coroutine erstellen
$coroutine = spawn(function() {
    echo "Hallo aus einer Coroutine!\n";
    return 42;
});

// $coroutine ist ein Objekt vom Typ Async\Coroutine
// Die Coroutine ist bereits zur Ausführung eingeplant
```

Sobald `spawn` aufgerufen wird, wird die Funktion vom Scheduler so bald wie möglich asynchron ausgeführt.

## Parameter übergeben

Die Funktion `spawn` akzeptiert ein `callable` und beliebige Parameter, die an diese Funktion
beim Start übergeben werden.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Funktion und Parameter übergeben
$coroutine = spawn(fetchUser(...), 123);
```

## Ergebnis abrufen

Um das Ergebnis einer Coroutine zu erhalten, verwenden Sie `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Fertig!";
});

echo "Coroutine gestartet\n";

// Auf das Ergebnis warten
$result = await($coroutine);

echo "Ergebnis: $result\n";
```

**Wichtig:** `await()` blockiert die Ausführung der **aktuellen Coroutine**, aber nicht den gesamten `PHP`-Prozess.
Andere Coroutinen laufen weiter.

## Lebenszyklus einer Coroutine

Eine Coroutine durchläuft mehrere Zustände:

1. **Queued** -- erstellt über `spawn()`, wartet auf den Start durch den Scheduler
2. **Running** -- wird gerade ausgeführt
3. **Suspended** -- pausiert, wartet auf I/O oder `suspend()`
4. **Completed** -- Ausführung beendet (mit einem Ergebnis oder einer Ausnahme)
5. **Cancelled** -- abgebrochen über `cancel()`

### Zustand prüfen

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - wartet auf Start
var_dump($coro->isStarted());   // false - noch nicht gestartet

suspend(); // Coroutine starten lassen

var_dump($coro->isStarted());    // true - die Coroutine wurde gestartet
var_dump($coro->isRunning());    // false - wird gerade nicht ausgeführt
var_dump($coro->isSuspended());  // true - suspendiert, wartet auf etwas
var_dump($coro->isCompleted());  // false - noch nicht beendet
var_dump($coro->isCancelled());  // false - nicht abgebrochen
```

## Suspendierung: suspend

Das Schlüsselwort `suspend` stoppt die Coroutine und übergibt die Kontrolle an den Scheduler:

```php
spawn(function() {
    echo "Vor suspend\n";

    suspend(); // Hier halten wir an

    echo "Nach suspend\n";
});

echo "Hauptcode\n";

// Ausgabe:
// Vor suspend
// Hauptcode
// Nach suspend
```

Die Coroutine stoppte bei `suspend`, die Kontrolle kehrte zum Hauptcode zurück. Später setzte der Scheduler die Coroutine fort.

### suspend mit Warten

Typischerweise wird `suspend` verwendet, um auf ein Ereignis zu warten:

```php
spawn(function() {
    echo "HTTP-Anfrage wird gesendet\n";

    $data = file_get_contents('https://api.example.com/data');
    // Innerhalb von file_get_contents wird implizit suspend aufgerufen
    // Während die Netzwerkanfrage läuft, ist die Coroutine suspendiert

    echo "Daten erhalten: $data\n";
});
```

PHP suspendiert die Coroutine automatisch bei I/O-Operationen. Sie müssen `suspend` nicht manuell schreiben.

## Abbrechen einer Coroutine

```php
$coro = spawn(function() {
    try {
        echo "Starte lange Arbeit\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // 100ms schlafen
            echo "Iteration $i\n";
        }

        echo "Fertig\n";
    } catch (Async\AsyncCancellation $e) {
        echo "Ich wurde während einer Iteration abgebrochen\n";
    }
});

// Coroutine 1 Sekunde arbeiten lassen
Async\sleep(1000);

// Abbrechen
$coro->cancel();

// Die Coroutine erhält AsyncCancellation beim nächsten await/suspend
```

**Wichtig:** Der Abbruch funktioniert kooperativ. Die Coroutine muss auf den Abbruch prüfen (über `await`, `sleep` oder `suspend`). Eine Coroutine kann nicht gewaltsam beendet werden.

## Mehrere Coroutinen

Starten Sie so viele wie gewünscht:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Auf alle Coroutinen warten
$results = array_map(fn($t) => await($t), $tasks);

echo "Es wurden " . count($results) . " Ergebnisse geladen\n";
```

Alle 10 Anfragen laufen nebenläufig. Statt 10 Sekunden (je eine Sekunde) dauert es nur ~1 Sekunde.

## Fehlerbehandlung

Fehler in Coroutinen werden mit regulärem `try-catch` behandelt:

```php
$coro = spawn(function() {
    throw new Exception("Hoppla!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Fehler abgefangen: " . $e->getMessage() . "\n";
}
```

Wenn der Fehler nicht abgefangen wird, wird er an den übergeordneten Scope weitergereicht:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Fehler in der Coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Fehler wurde an den Scope weitergereicht: " . $e->getMessage() . "\n";
}
```

## Coroutine = Objekt

Eine Coroutine ist ein vollwertiges PHP-Objekt. Sie können sie überall hin übergeben:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Lange Arbeit
        Async\sleep(10000);
        return "Ergebnis";
    });
}

$task = startBackgroundTask();

// An eine andere Funktion übergeben
processTask($task);

// Oder in einem Array speichern
$tasks[] = $task;

// Oder in einer Objekteigenschaft
$this->backgroundTask = $task;
```

## Verschachtelte Coroutinen

Coroutinen können andere Coroutinen starten:

```php
spawn(function() {
    echo "Eltern-Coroutine\n";

    $child1 = spawn(function() {
        echo "Kind-Coroutine 1\n";
        return "Ergebnis 1";
    });

    $child2 = spawn(function() {
        echo "Kind-Coroutine 2\n";
        return "Ergebnis 2";
    });

    // Auf beide Kind-Coroutinen warten
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Eltern hat empfangen: $result1 und $result2\n";
});
```

## Finally: Garantierte Aufräumarbeiten

Auch wenn eine Coroutine abgebrochen wird, wird `finally` ausgeführt:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Kann hier abgebrochen werden
        }
    } finally {
        // Datei wird auf jeden Fall geschlossen
        fclose($file);
        echo "Datei geschlossen\n";
    }
});
```

## Debugging von Coroutinen

### Aufrufstapel abrufen

```php
$coro = spawn(function() {
    doSomething();
});

// Aufrufstapel der Coroutine abrufen
$trace = $coro->getTrace();
print_r($trace);
```

### Herausfinden, wo eine Coroutine erstellt wurde

```php
$coro = spawn(someFunction(...));

// Wo spawn() aufgerufen wurde
echo "Coroutine erstellt in: " . $coro->getSpawnLocation() . "\n";
// Ausgabe: "Coroutine erstellt in: /app/server.php:42"

// Oder als Array [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Herausfinden, wo eine Coroutine suspendiert ist

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // suspendiert hier
});

suspend(); // Coroutine starten lassen

echo "Suspendiert bei: " . $coro->getSuspendLocation() . "\n";
// Ausgabe: "Suspendiert bei: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Warte-Informationen

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Herausfinden, worauf die Coroutine wartet
$info = $coro->getAwaitingInfo();
print_r($info);
```

Sehr nützlich zum Debugging -- man kann sofort sehen, woher eine Coroutine stammt und wo sie angehalten hat.

## Coroutinen vs. Threads

| Coroutinen                    | Threads                       |
|-------------------------------|-------------------------------|
| Leichtgewichtig               | Schwergewichtig               |
| Schnelle Erstellung (<1us)    | Langsame Erstellung (~1ms)    |
| Einzelner OS-Thread           | Mehrere OS-Threads            |
| Kooperatives Multitasking     | Präemptives Multitasking      |
| Keine Race Conditions         | Race Conditions möglich       |
| Erfordert Await-Punkte        | Kann überall unterbrochen werden |
| Für I/O-Operationen           | Für CPU-intensive Berechnungen |

## Verzögerter Abbruch mit protect()

Wenn sich eine Coroutine in einem geschützten Abschnitt über `protect()` befindet, wird der Abbruch aufgeschoben, bis der geschützte Block abgeschlossen ist:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Kritische Operation -- Abbruch wird aufgeschoben
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // Abbruch erfolgt hier, nach Verlassen von protect()
    echo "Ergebnis: $result\n";
});

suspend();

$coro->cancel(); // Abbruch wird aufgeschoben -- protect() wird vollständig abgeschlossen
```

Das Flag `isCancellationRequested()` wird sofort `true`, während `isCancelled()` erst `true` wird, nachdem die Coroutine tatsächlich beendet wurde.

## Klassenübersicht

```php
final class Async\Coroutine implements Async\Completable {

    /* Identifikation */
    public getId(): int

    /* Priorität */
    public asHiPriority(): Coroutine

    /* Kontext */
    public getContext(): Async\Context

    /* Ergebnis und Fehler */
    public getResult(): mixed
    public getException(): mixed

    /* Zustand */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Steuerung */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Debugging */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Inhaltsverzeichnis

- [Coroutine::getId](/de/docs/reference/coroutine/get-id.html) -- Eindeutigen Coroutine-Bezeichner abrufen
- [Coroutine::asHiPriority](/de/docs/reference/coroutine/as-hi-priority.html) -- Coroutine als hochprior markieren
- [Coroutine::getContext](/de/docs/reference/coroutine/get-context.html) -- Lokalen Kontext der Coroutine abrufen
- [Coroutine::getResult](/de/docs/reference/coroutine/get-result.html) -- Ausführungsergebnis abrufen
- [Coroutine::getException](/de/docs/reference/coroutine/get-exception.html) -- Ausnahme der Coroutine abrufen
- [Coroutine::isStarted](/de/docs/reference/coroutine/is-started.html) -- Prüfen, ob die Coroutine gestartet wurde
- [Coroutine::isQueued](/de/docs/reference/coroutine/is-queued.html) -- Prüfen, ob die Coroutine in der Warteschlange steht
- [Coroutine::isRunning](/de/docs/reference/coroutine/is-running.html) -- Prüfen, ob die Coroutine gerade ausgeführt wird
- [Coroutine::isSuspended](/de/docs/reference/coroutine/is-suspended.html) -- Prüfen, ob die Coroutine suspendiert ist
- [Coroutine::isCompleted](/de/docs/reference/coroutine/is-completed.html) -- Prüfen, ob die Coroutine abgeschlossen ist
- [Coroutine::isCancelled](/de/docs/reference/coroutine/is-cancelled.html) -- Prüfen, ob die Coroutine abgebrochen wurde
- [Coroutine::isCancellationRequested](/de/docs/reference/coroutine/is-cancellation-requested.html) -- Prüfen, ob ein Abbruch angefordert wurde
- [Coroutine::cancel](/de/docs/reference/coroutine/cancel.html) -- Coroutine abbrechen
- [Coroutine::finally](/de/docs/reference/coroutine/on-finally.html) -- Abschluss-Handler registrieren
- [Coroutine::getTrace](/de/docs/reference/coroutine/get-trace.html) -- Aufrufstapel einer suspendierten Coroutine abrufen
- [Coroutine::getSpawnFileAndLine](/de/docs/reference/coroutine/get-spawn-file-and-line.html) -- Datei und Zeile abrufen, wo die Coroutine erstellt wurde
- [Coroutine::getSpawnLocation](/de/docs/reference/coroutine/get-spawn-location.html) -- Erstellungsort als String abrufen
- [Coroutine::getSuspendFileAndLine](/de/docs/reference/coroutine/get-suspend-file-and-line.html) -- Datei und Zeile abrufen, wo die Coroutine suspendiert wurde
- [Coroutine::getSuspendLocation](/de/docs/reference/coroutine/get-suspend-location.html) -- Suspendierungsort als String abrufen
- [Coroutine::getAwaitingInfo](/de/docs/reference/coroutine/get-awaiting-info.html) -- Warte-Informationen abrufen

## Was kommt als Nächstes

- [Scope](/de/docs/components/scope.html) -- Verwaltung von Coroutine-Gruppen
- [Cancellation](/de/docs/components/cancellation.html) -- Details zu Abbruch und protect()
- [spawn()](/de/docs/reference/spawn.html) -- vollständige Dokumentation
- [await()](/de/docs/reference/await.html) -- vollständige Dokumentation
