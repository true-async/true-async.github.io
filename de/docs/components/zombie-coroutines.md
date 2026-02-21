---
layout: docs
lang: de
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /de/docs/components/zombie-coroutines.html
page_title: "Zombie-Coroutinen"
description: "Zombie-Coroutinen in TrueAsync -- Toleranz für Drittanbieter-Code, disposeSafely(), disposeAfterTimeout(), Verwaltung nicht abbrechbarer Aufgaben."
---

# Zombie-Coroutinen: Fehlertoleranz

## Das Problem: Code, der nicht abgebrochen werden kann

Der Abbruch von Coroutinen ist ein kooperativer Prozess. Die Coroutine empfängt eine `Cancellation`-Ausnahme
an einem Suspendierungspunkt und muss ordnungsgemäß terminieren. Aber was, wenn jemand einen Fehler gemacht und eine Coroutine im falschen `Scope` erstellt hat?
Obwohl `TrueAsync` dem Prinzip `Cancellation by design` folgt, können Situationen entstehen, in denen jemand Code geschrieben hat,
dessen Abbruch zu einem unangenehmen Ergebnis führen könnte.
Zum Beispiel hat jemand eine Hintergrundaufgabe zum Senden einer `E-Mail` erstellt. Die Coroutine wurde abgebrochen, die `E-Mail` wurde nie gesendet.

Hohe Fehlertoleranz ermöglicht erhebliche Einsparungen bei der Entwicklungszeit
und minimiert die Folgen von Fehlern, wenn Programmierer die Log-Analyse nutzen, um die Anwendungsqualität zu verbessern.

## Die Lösung: Zombie-Coroutinen

Um solche Situationen abzumildern, bietet `TrueAsync` einen speziellen Ansatz:
tolerante Behandlung von "hängenden" Coroutinen -- Zombie-Coroutinen.

Eine `Zombie`-Coroutine ist eine Coroutine, die:
* Ihre Ausführung normal fortsetzt
* An ihren Scope gebunden bleibt
* Nicht als aktiv gilt -- der Scope kann formal abgeschlossen werden, ohne auf sie zu warten
* `awaitCompletion()` nicht blockiert, aber `awaitAfterCancellation()` blockiert

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // Drittanbieter-Code -- wir wissen nicht, wie er auf Abbruch reagiert
});

$scope->spawn(function() {
    return myOwnCode(); // Unser Code -- behandelt Abbruch korrekt
});

// disposeSafely() bricht Coroutinen NICHT ab, sondern markiert sie als Zombie
$scope->disposeSafely();
// Scope ist für neue Coroutinen geschlossen.
// Bestehende Coroutinen arbeiten als Zombies weiter.
```

## Drei Strategien für die Scope-Beendigung

`TrueAsync` bietet drei Möglichkeiten, einen `Scope` zu schließen, konzipiert für verschiedene Vertrauensstufen in den Code:

### `dispose()` -- Erzwungener Abbruch

Alle Coroutinen erhalten `Cancellation`. Der Scope schließt sofort.
Verwenden Sie dies, wenn Sie den gesamten Code innerhalb des Scopes kontrollieren.

```php
$scope->dispose();
// Alle Coroutinen sind abgebrochen. Scope ist geschlossen.
```

### `disposeSafely()` -- Kein Abbruch, Coroutinen werden zu Zombies

Coroutinen erhalten **keine** `Cancellation`. Sie werden als `Zombie` markiert und laufen weiter.
Der `Scope` gilt als geschlossen -- neue Coroutinen können nicht erstellt werden.

Verwenden Sie dies, wenn der `Scope` "Drittanbieter"-Code enthält und Sie nicht sicher sind, ob der Abbruch korrekt funktioniert.

```php
$scope->disposeSafely();
// Coroutinen arbeiten als Zombies weiter.
// Scope ist für neue Aufgaben geschlossen.
```

### `disposeAfterTimeout(int $timeout)` -- Abbruch mit Timeout

Eine Kombination beider Ansätze: Zunächst wird den Coroutinen Zeit zum Beenden gegeben,
dann wird der `Scope` erzwungen abgebrochen.

```php
$scope->disposeAfterTimeout(5000);
// Nach 5 Sekunden sendet der Scope Cancellation an alle verbleibenden Coroutinen.
```

## Warten auf Zombie-Coroutinen

`awaitCompletion()` wartet nur auf **aktive** Coroutinen. Sobald alle Coroutinen zu Zombies werden,
betrachtet `awaitCompletion()` den Scope als abgeschlossen und gibt die Kontrolle zurück.

Aber manchmal muss man auf den Abschluss **aller** Coroutinen warten, einschließlich Zombies.
Dafür gibt es `awaitAfterCancellation()`:

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// Abbrechen -- Coroutinen, die nicht abgebrochen werden können, werden zu Zombies
$scope->cancel();

// awaitCompletion() gibt sofort zurück, wenn nur noch Zombies übrig sind
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() wartet auf ALLE, einschließlich Zombies
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // Fehlerhandler für Zombie-Coroutinen
    echo "Zombie-Fehler: " . $error->getMessage() . "\n";
});
```

| Methode                      | Wartet auf aktive | Wartet auf Zombies | Erfordert cancel() |
|------------------------------|:-----------------:|:------------------:|:------------------:|
| `awaitCompletion()`          |        Ja         |        Nein        |        Nein        |
| `awaitAfterCancellation()`   |        Ja         |         Ja         |         Ja         |

`awaitAfterCancellation()` kann nur nach `cancel()` aufgerufen werden -- andernfalls tritt ein Fehler auf.
Das ist sinnvoll: Zombie-Coroutinen entstehen genau als Ergebnis eines Abbruchs mit dem `DISPOSE_SAFELY`-Flag.

## Wie Zombies intern funktionieren

Wenn eine Coroutine als `Zombie` markiert wird, passiert Folgendes:

1. Die Coroutine erhält das `ZOMBIE`-Flag
2. Der Zähler aktiver Coroutinen im `Scope` verringert sich um 1
3. Der `Zombie`-Coroutinen-Zähler erhöht sich um 1
4. Der `Scope` prüft, ob noch aktive Coroutinen vorhanden sind, und kann Wartende über den Abschluss benachrichtigen

```
Scope
+-- active_coroutines_count: 0    <-- verringert sich
+-- zombie_coroutines_count: 2    <-- erhöht sich
+-- coroutine A (zombie)          <-- läuft weiter
+-- coroutine B (zombie)          <-- läuft weiter
```

Eine `Zombie`-Coroutine ist **nicht** vom `Scope` getrennt. Sie verbleibt in der Coroutine-Liste,
wird aber nicht als aktiv gezählt. Wenn eine `Zombie`-Coroutine schließlich abgeschlossen wird,
wird sie aus dem `Scope` entfernt, und der `Scope` prüft, ob er Ressourcen vollständig freigeben kann.

## Wie der Scheduler Zombies behandelt

Der `Scheduler` verwaltet zwei unabhängige Coroutine-Zähler:

1. **Globaler Zähler aktiver Coroutinen** (`active_coroutine_count`) -- wird für schnelle Prüfungen verwendet,
   ob etwas geplant werden muss
2. **Coroutine-Registry** (`coroutines`-Hash-Tabelle) -- enthält **alle** noch laufenden Coroutinen,
   einschließlich `Zombies`

Wenn eine Coroutine als `Zombie` markiert wird:
* Der globale Zähler aktiver Coroutinen **verringert sich** -- der Scheduler betrachtet es als weniger aktive Arbeit
* Die Coroutine **verbleibt** in der Registry -- der `Scheduler` verwaltet weiterhin ihre Ausführung

Die Anwendung läuft weiter, solange der Zähler aktiver Coroutinen größer als null ist. Daraus folgt eine wichtige Konsequenz:
`Zombie`-Coroutinen verhindern nicht das Herunterfahren der Anwendung, da sie nicht als aktiv gelten.
Wenn es keine aktiven Coroutinen mehr gibt, wird die Anwendung beendet und selbst `Zombie`-Coroutinen werden abgebrochen.

## Vererbung des Safely-Flags

Standardmäßig wird ein `Scope` mit dem `DISPOSE_SAFELY`-Flag erstellt.
Das bedeutet: Wenn der `Scope` zerstört wird (z.B. im Destruktor eines Objekts),
werden Coroutinen zu `Zombies`, anstatt abgebrochen zu werden.

Ein Kind-`Scope` erbt dieses Flag von seinem Elternteil:

```php
$parent = new Async\Scope();
// parent hat standardmäßig das DISPOSE_SAFELY-Flag

$child = Async\Scope::inherit($parent);
// child hat ebenfalls das DISPOSE_SAFELY-Flag
```

Wenn Sie erzwungenen Abbruch bei Zerstörung wünschen, verwenden Sie `asNotSafely()`:

```php
$scope = (new Async\Scope())->asNotSafely();
// Jetzt werden beim Zerstören des Scope-Objekts
// Coroutinen erzwungen abgebrochen, anstatt als Zombies markiert zu werden
```

## Beispiel: HTTP-Server mit Middleware

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // Middleware starten -- das könnte Drittanbieter-Code sein
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // Hauptverarbeitung -- unser Code
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // Bei Zerstörung: Middleware ist möglicherweise nicht für Abbruch bereit,
        // daher verwenden wir disposeSafely() (Standardverhalten).
        // Zombie-Coroutinen werden von selbst fertig.
        $this->scope->disposeSafely();
    }
}
```

## Beispiel: Handler mit Zeitlimit

```php
$scope = new Async\Scope();

// Aufgaben mit Drittanbieter-Code starten
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// 10 Sekunden zum Beenden geben, dann erzwungener Abbruch
$scope->disposeAfterTimeout(10000);
```

## Wann Zombies zum Problem werden

`Zombie`-Coroutinen sind ein Kompromiss. Sie lösen das Problem mit Drittanbieter-Code,
können aber zu Ressourcen-Leaks führen.

Daher ist `disposeAfterTimeout()` oder ein `Scope` mit explizitem Coroutine-Abbruch die beste Wahl für die Produktion:
Es gibt Drittanbieter-Code Zeit zum Beenden, garantiert aber den Abbruch bei Hängenbleiben.

## Zusammenfassung

| Methode                     | Bricht Coroutinen ab | Coroutinen beenden  | Scope geschlossen |
|-----------------------------|:--------------------:|:-------------------:|:-----------------:|
| `dispose()`                 |         Ja           |        Nein         |        Ja         |
| `disposeSafely()`           |        Nein          | Ja (als Zombies)    |        Ja         |
| `disposeAfterTimeout(ms)`   |   Nach Timeout       | Bis zum Timeout     |        Ja         |

## Protokollierung von Zombie-Coroutinen

In zukünftigen Versionen plant `TrueAsync`, einen Mechanismus zur Protokollierung von Zombie-Coroutinen bereitzustellen, der es
Entwicklern ermöglicht, Probleme mit hängenden Aufgaben zu beheben.

## Was kommt als Nächstes?

- [Scope](/de/docs/components/scope.html) -- Verwaltung von Coroutine-Gruppen
- [Abbruch](/de/docs/components/cancellation.html) -- Abbruchmuster
- [Coroutinen](/de/docs/components/coroutines.html) -- Coroutine-Lebenszyklus
