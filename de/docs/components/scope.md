---
layout: docs
lang: de
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /de/docs/components/scope.html
page_title: "Scope"
description: "Scope in TrueAsync -- Verwaltung von Coroutine-Lebenszyklen, Hierarchie, Gruppenabbruch, Fehlerbehandlung und strukturierte Nebenläufigkeit."
---

# Scope: Verwaltung von Coroutine-Lebenszyklen

## Das Problem: Explizite Ressourcenkontrolle, vergessene Coroutinen

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// Die Funktion hat zurückgegeben, aber drei Coroutinen laufen noch!
// Wer überwacht sie? Wann werden sie fertig?
// Wer behandelt Ausnahmen, wenn sie auftreten?
```

Eines der häufigsten Probleme in der asynchronen Programmierung sind Coroutinen, die vom Entwickler versehentlich "vergessen" werden.
Sie werden gestartet, verrichten Arbeit, aber niemand überwacht ihren Lebenszyklus.
Das kann zu Ressourcen-Leaks, unvollständigen Operationen und schwer auffindbaren Bugs führen.
Für `stateful`-Anwendungen ist dieses Problem besonders gravierend.

## Die Lösung: Scope

![Scope-Konzept](../../../assets/docs/scope_concept.jpg)

**Scope** -- ein logischer Raum für die Ausführung von Coroutinen, der mit einer Sandbox verglichen werden kann.

Die folgenden Regeln garantieren, dass Coroutinen unter Kontrolle bleiben:
* Code weiß immer, in welchem `Scope` er ausgeführt wird
* Die Funktion `spawn()` erstellt eine Coroutine im aktuellen `Scope`
* Ein `Scope` kennt alle Coroutinen, die zu ihm gehören

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Warte, bis alle Coroutinen im Scope abgeschlossen sind
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Jetzt gibt die Funktion erst zurück, wenn ALLE Coroutinen abgeschlossen sind
```

## Bindung an ein Objekt

`Scope` lässt sich bequem an ein Objekt binden, um die Eigentümerschaft über eine Gruppe von Coroutinen explizit auszudrücken.
Solche Semantik drückt direkt die Absicht des Programmierers aus.

```php
class UserService
{
    // Nur ein einzigartiges Objekt besitzt einen einzigartigen Scope
    // Coroutinen leben so lange wie das UserService-Objekt
    private Scope $scope;

    public function __construct() {
        // Erstelle eine Kuppel für alle Service-Coroutinen
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Starte eine Coroutine innerhalb unserer Kuppel
        $this->scope->spawn(function() use ($userId) {
            // Diese Coroutine ist an UserService gebunden
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Wenn das Objekt gelöscht wird, werden Ressourcen garantiert aufgeräumt
        // Alle Coroutinen darin werden automatisch abgebrochen
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Service löschen - alle seine Coroutinen werden automatisch abgebrochen
unset($service);
```

## Scope-Hierarchie

Ein Scope kann andere Scopes enthalten. Wenn ein übergeordneter Scope abgebrochen wird,
werden auch alle untergeordneten Scopes und deren Coroutinen abgebrochen.

Dieser Ansatz wird als **strukturierte Nebenläufigkeit** bezeichnet.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Hauptaufgabe\n";

    // Erstelle einen untergeordneten Scope
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Teilaufgabe 1\n";
    });

    $childScope->spawn(function() {
        echo "Teilaufgabe 2\n";
    });

    // Warte auf Abschluss der Teilaufgaben
    $childScope->awaitCompletion();

    echo "Alle Teilaufgaben erledigt\n";
});

$mainScope->awaitCompletion();
```

Wenn Sie `$mainScope` abbrechen, werden auch alle untergeordneten Scopes abgebrochen. Die gesamte Hierarchie.

## Abbruch aller Coroutinen in einem Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Arbeite...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Ich wurde abgebrochen!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Arbeite ebenfalls...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Ich auch!\n";
    }
});

// Arbeitet 3 Sekunden lang
Async\sleep(3000);

// Bricht ALLE Coroutinen im Scope ab
$scope->cancel();

// Beide Coroutinen erhalten AsyncCancellation
```

## Fehlerbehandlung im Scope

Wenn eine Coroutine innerhalb eines Scopes mit einem Fehler fehlschlägt, kann der Scope ihn abfangen:

```php
$scope = new Async\Scope();

// Fehlerhandler einrichten
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Fehler im Scope: " . $e->getMessage() . "\n";
    // Kann protokolliert, an Sentry gesendet werden usw.
});

$scope->spawn(function() {
    throw new Exception("Etwas ist schiefgelaufen!");
});

$scope->spawn(function() {
    echo "Ich arbeite einwandfrei\n";
});

$scope->awaitCompletion();

// Ausgabe:
// Fehler im Scope: Etwas ist schiefgelaufen!
// Ich arbeite einwandfrei
```

## Finally: Garantierte Aufräumarbeiten

Selbst wenn ein Scope abgebrochen wird, werden finally-Blöcke ausgeführt:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Starte Arbeit\n";
        Async\sleep(10000); // Lange Operation
        echo "Fertig\n"; // Wird nicht ausgeführt
    } finally {
        // Dies wird GARANTIERT ausgeführt
        echo "Räume Ressourcen auf\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Abbruch nach einer Sekunde

// Ausgabe:
// Starte Arbeit
// Räume Ressourcen auf
```

## TaskGroup: Scope mit Ergebnissen

`TaskGroup` -- ein spezialisierter Scope für parallele Aufgabenausführung
mit Ergebnisaggregation. Er unterstützt Nebenläufigkeitslimits,
benannte Aufgaben und drei Wartestrategien:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Alle Ergebnisse abrufen (wartet auf Abschluss aller Aufgaben)
$results = await($group->all());

// Oder das erste abgeschlossene Ergebnis abrufen
$first = await($group->race());

// Oder das erste erfolgreiche (Fehler ignorierend)
$any = await($group->any());
```

Aufgaben können mit Schlüsseln hinzugefügt und bei Abschluss iteriert werden:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Über Ergebnisse iterieren, sobald sie bereit sind
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Aufgabe $key fehlgeschlagen: {$error->getMessage()}\n";
    } else {
        echo "Aufgabe $key: $result\n";
    }
}
```

## Globaler Scope: Es gibt immer einen Elternteil

Wenn Sie keinen Scope explizit angeben, wird die Coroutine im **globalen Scope** erstellt:

```php
// Ohne Angabe eines Scopes
spawn(function() {
    echo "Ich bin im globalen Scope\n";
});

// Dasselbe wie:
Async\Scope::global()->spawn(function() {
    echo "Ich bin im globalen Scope\n";
});
```

Der globale Scope lebt für die gesamte Anfrage. Wenn PHP beendet wird, werden alle Coroutinen im globalen Scope ordnungsgemäß abgebrochen.

## Praxisbeispiel: HTTP-Client

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Alle aktiven Anfragen abbrechen
        $this->scope->cancel();
    }

    public function __destruct() {
        // Wenn der Client zerstört wird, werden alle Anfragen automatisch abgebrochen
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Alle Anfragen abbrechen
$client->cancelAll();

// Oder einfach den Client zerstören - gleicher Effekt
unset($client);
```

## Strukturierte Nebenläufigkeit

`Scope` implementiert das Prinzip der **strukturierten Nebenläufigkeit** --
eine Reihe von Regeln für die Verwaltung nebenläufiger Aufgaben, bewährt in den Produktions-Laufzeiten
von `Kotlin`, `Swift` und `Java`.

### API zur Lebenszyklus-Verwaltung

`Scope` bietet die Möglichkeit, den Lebenszyklus einer Coroutine-Hierarchie
explizit zu steuern, mit folgenden Methoden:

| Methode                                  | Was sie macht                                                    |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Startet eine Coroutine innerhalb des Scopes                      |
| `$scope->awaitCompletion($cancellation)` | Wartet auf Abschluss aller Coroutinen im Scope                   |
| `$scope->cancel()`                       | Sendet ein Abbruchsignal an alle Coroutinen                      |
| `$scope->dispose()`                      | Schließt den Scope und bricht alle Coroutinen erzwungen ab       |
| `$scope->disposeSafely()`               | Schließt den Scope; Coroutinen werden nicht abgebrochen, sondern als Zombie markiert |
| `$scope->awaitAfterCancellation()`       | Wartet auf Abschluss aller Coroutinen, einschließlich Zombie-Coroutinen |
| `$scope->disposeAfterTimeout(int $ms)`   | Bricht Coroutinen nach einem Timeout ab                          |

Diese Methoden ermöglichen die Implementierung von drei Schlüsselmustern:

**1. Elternteil wartet auf alle Kind-Aufgaben**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* Aufgabe 1 */ });
$scope->spawn(function() { /* Aufgabe 2 */ });

// Die Kontrolle wird erst zurückgegeben, wenn beide Aufgaben abgeschlossen sind
$scope->awaitCompletion();
```

In Kotlin wird dasselbe mit `coroutineScope { }` erreicht,
in Swift -- mit `withTaskGroup { }`.

**2. Elternteil bricht alle Kind-Aufgaben ab**

```php
$scope->cancel();
// Alle Coroutinen in $scope erhalten ein Abbruchsignal.
// Untergeordnete Scopes werden ebenfalls abgebrochen -- rekursiv, bis in jede Tiefe.
```

**3. Elternteil schließt den Scope und gibt Ressourcen frei**

`dispose()` schließt den Scope und bricht alle seine Coroutinen erzwungen ab:

```php
$scope->dispose();
// Scope ist geschlossen. Alle Coroutinen sind abgebrochen.
// Neue Coroutinen können nicht zu diesem Scope hinzugefügt werden.
```

Wenn Sie den Scope schließen, aber den aktuellen Coroutinen erlauben möchten, **ihre Arbeit zu beenden**,
verwenden Sie `disposeSafely()` -- Coroutinen werden als Zombie markiert
(nicht abgebrochen, sie laufen weiter, aber der Scope gilt bei aktiven Aufgaben als beendet):

```php
$scope->disposeSafely();
// Scope ist geschlossen. Coroutinen arbeiten als Zombies weiter.
// Scope verfolgt sie, zählt sie aber nicht als aktiv.
```

### Fehlerbehandlung: Zwei Strategien

Eine unbehandelte Ausnahme in einer Coroutine geht nicht verloren -- sie steigt zum übergeordneten Scope auf.
Verschiedene Laufzeiten bieten unterschiedliche Strategien:

| Strategie                                                        | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Gemeinsam scheitern**: Fehler eines Kindes bricht alle anderen ab | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (Standard)                 |
| **Unabhängige Kinder**: Fehler eines Kindes beeinflusst andere nicht | `supervisorScope` | separater `Task`        | `$scope->setExceptionHandler(...)` |

Die Möglichkeit, eine Strategie zu wählen, ist der Hauptunterschied zu "fire and forget".

### Kontextvererbung

Kind-Aufgaben erhalten automatisch den Kontext des Elternteils:
Priorität, Deadlines, Metadaten -- ohne explizite Parameterübergabe.

In Kotlin erben Kind-Coroutinen den `CoroutineContext` des Elternteils (Dispatcher, Name, `Job`).
In Swift erben Kind-`Task`-Instanzen Priorität und task-lokale Werte.

### Wo das bereits funktioniert

| Sprache    | API                                                             | In Produktion seit |
|------------|-----------------------------------------------------------------|--------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018               |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021               |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (Vorschau)    |

TrueAsync bringt diesen Ansatz über `Async\Scope` nach PHP.

## Was kommt als Nächstes?

- [Coroutinen](/de/docs/components/coroutines.html) -- wie Coroutinen funktionieren
- [Abbruch](/de/docs/components/cancellation.html) -- Abbruchmuster
- [Zombie-Coroutinen](/de/docs/components/zombie-coroutines.html) -- Toleranz für Drittanbieter-Code
