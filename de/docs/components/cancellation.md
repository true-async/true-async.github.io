---
layout: docs
lang: de
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /de/docs/components/cancellation.html
page_title: "Abbruch"
description: "Abbruch von Koroutinen in TrueAsync -- kooperativer Abbruch, kritische Abschnitte mit protect(), kaskadierender Abbruch über Scope, Timeouts."
---

# Abbruch

Ein Browser hat eine Anfrage gesendet, aber dann hat der Benutzer die Seite geschlossen.
Der Server arbeitet weiterhin an einer Anfrage, die nicht mehr benötigt wird.
Es wäre gut, die Operation abzubrechen, um unnötige Kosten zu vermeiden.
Oder nehmen wir an, es gibt einen lang laufenden Datenkopierprozess, der plötzlich abgebrochen werden muss.
Es gibt viele Szenarien, in denen Operationen gestoppt werden müssen.
Normalerweise wird dieses Problem mit Flag-Variablen oder Abbruch-Tokens gelöst, was recht arbeitsintensiv ist. Der Code muss wissen,
dass er abgebrochen werden könnte, muss Abbruch-Checkpoints planen und diese Situationen korrekt behandeln.

## Abbruchfähig by Design

Die meiste Zeit ist eine Anwendung damit beschäftigt, Daten
aus Datenbanken, Dateien oder dem Netzwerk zu lesen. Das Unterbrechen eines Lesevorgangs ist sicher.
Daher gilt in `TrueAsync` folgendes Prinzip: **Eine Koroutine kann jederzeit aus einem Wartezustand abgebrochen werden**.
Dieser Ansatz reduziert die Codemenge, da der Programmierer sich in den meisten Fällen keine Gedanken
über den Abbruch machen muss.

## Wie der Abbruch funktioniert

Eine spezielle Exception -- `Cancellation` -- wird zum Abbrechen einer Koroutine verwendet.
Die `Cancellation`-Exception oder eine abgeleitete wird an einem Suspendierungspunkt (`suspend()`, `await()`, `delay()`) geworfen.
Die Ausführung kann auch während I/O-Operationen oder jeder anderen blockierenden Operation unterbrochen werden.

```php
$coroutine = spawn(function() {
    echo "Starting work\n";
    suspend(); // Hier erhält die Koroutine Cancellation
    echo "This won't happen\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancelled\n";
    throw $e;
}
```

## Abbruch kann nicht unterdrückt werden

`Cancellation` ist eine Exception auf Basisebene, gleichrangig mit `Error` und `Exception`.
Das `catch (Exception $e)`-Konstrukt fängt sie nicht ab.

`Cancellation` abzufangen und die Arbeit fortzusetzen ist ein Fehler.
Sie können `catch Async\AsyncCancellation` verwenden, um spezielle Situationen zu behandeln,
müssen aber sicherstellen, dass die Exception korrekt erneut geworfen wird.
Generell wird empfohlen, `finally` für die garantierte Ressourcenfreigabe zu verwenden:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Drei Abbruchszenarien

Das Verhalten von `cancel()` hängt vom Zustand der Koroutine ab:

**Die Koroutine hat noch nicht gestartet** -- sie wird niemals starten.

```php
$coroutine = spawn(function() {
    echo "Won't execute\n";
});
$coroutine->cancel();
```

**Die Koroutine befindet sich im Wartezustand** -- sie wird mit einer `Cancellation`-Exception aufgeweckt.

```php
$coroutine = spawn(function() {
    echo "Started work\n";
    suspend(); // Hier erhält sie Cancellation
    echo "Won't execute\n";
});

suspend();
$coroutine->cancel();
```

**Die Koroutine ist bereits abgeschlossen** -- nichts passiert.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Kein Fehler, aber ohne Wirkung
```

## Kritische Abschnitte: protect()

Nicht jede Operation kann sicher unterbrochen werden.
Wenn eine Koroutine Geld von einem Konto abgebucht, aber noch nicht auf ein anderes überwiesen hat --
ein Abbruch zu diesem Zeitpunkt würde zu Datenverlust führen.

Die Funktion `protect()` verschiebt den Abbruch, bis der kritische Abschnitt abgeschlossen ist:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // Abbruch wird hier wirksam -- nach dem Verlassen von protect()
});

suspend();
$coroutine->cancel();
```

Innerhalb von `protect()` wird die Koroutine als geschützt markiert.
Wenn `cancel()` in diesem Moment eintrifft, wird der Abbruch gespeichert,
aber nicht angewendet. Sobald `protect()` abgeschlossen ist --
tritt der verzögerte Abbruch sofort in Kraft.

## Kaskadierender Abbruch über Scope

Wenn ein `Scope` abgebrochen wird, werden alle seine Koroutinen und alle untergeordneten Scopes abgebrochen.
Die Kaskade geht **nur von oben nach unten** -- das Abbrechen eines untergeordneten Scopes beeinflusst weder den übergeordneten noch Geschwister-Scopes.

### Isolation: Das Abbrechen eines Kindes beeinflusst andere nicht

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Nur child1 abbrechen
$child1->cancel();

$parent->isCancelled(); // false -- übergeordneter Scope nicht betroffen
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- Geschwister-Scope nicht betroffen
```

### Abwärts-Kaskade: Das Abbrechen eines Elternteils bricht alle Nachkommen ab

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Kaskade: bricht sowohl child1 als auch child2 ab

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Eine Koroutine kann ihren eigenen Scope abbrechen

Eine Koroutine kann den Abbruch des Scopes einleiten, in dem sie ausgeführt wird. Code vor dem nächsten Suspendierungspunkt wird weiterhin ausgeführt:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Starting\n";
    $scope->cancel();
    echo "This will still execute\n";
    suspend();
    echo "But this won't\n";
});
```

Nach dem Abbruch ist der Scope geschlossen -- das Starten einer neuen Koroutine darin ist nicht mehr möglich.

## Timeouts

Ein Spezialfall des Abbruchs ist ein Timeout. Die Funktion `timeout()` erstellt ein Zeitlimit:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "API didn't respond within 5 seconds\n";
}
```

`TimeoutException` ist ein Untertyp von `Cancellation`,
daher wird die Koroutine nach denselben Regeln beendet.

## Zustand prüfen

Eine Koroutine bietet zwei Methoden zur Abbruchprüfung:

- `isCancellationRequested()` -- Abbruch wurde angefordert, aber noch nicht angewendet
- `isCancelled()` -- die Koroutine hat tatsächlich gestoppt

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- noch nicht verarbeitet

suspend();

$coroutine->isCancelled();             // true
```

## Beispiel: Queue Worker mit Graceful Shutdown

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // Alle Koroutinen werden hier gestoppt
        $this->scope->cancel();
    }
}
```

## Wie geht es weiter?

- [Scope](/de/docs/components/scope.html) -- Verwaltung von Koroutinen-Gruppen
- [Koroutinen](/de/docs/components/coroutines.html) -- Lebenszyklus von Koroutinen
- [Channels](/de/docs/components/channels.html) -- Datenaustausch zwischen Koroutinen
