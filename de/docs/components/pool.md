---
layout: docs
lang: de
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /de/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- universeller Ressourcenpool für Koroutinen: Erstellung, acquire/release, Healthcheck, Circuit Breaker."
---

# Async\Pool: Universeller Ressourcenpool

## Warum ein Pool benötigt wird

Bei der Arbeit mit Koroutinen entsteht das Problem der gemeinsamen Nutzung von I/O-Deskriptoren.
Wenn derselbe Socket von zwei Koroutinen verwendet wird, die gleichzeitig verschiedene Pakete schreiben oder lesen,
werden die Daten durcheinander gebracht und das Ergebnis ist unvorhersehbar.
Daher können Sie nicht einfach dasselbe `PDO`-Objekt in verschiedenen Koroutinen verwenden!

Andererseits ist das wiederholte Erstellen einer separaten Verbindung für jede Koroutine eine sehr verschwenderische Strategie.
Dadurch werden die Vorteile der gleichzeitigen I/O zunichte gemacht. Deshalb werden üblicherweise Verbindungspools
für die Interaktion mit externen APIs, Datenbanken und anderen Ressourcen verwendet.

Ein Pool löst dieses Problem: Ressourcen werden im Voraus erstellt, auf Anfrage an Koroutinen vergeben
und zur Wiederverwendung zurückgegeben.

```php
use Async\Pool;

// HTTP-Verbindungspool
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Eine Koroutine nimmt eine Verbindung, nutzt sie und gibt sie zurück
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Pool erstellen

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Wie eine Ressource erstellt wird
    destructor:         fn($r) => $r->close(),          // Wie eine Ressource zerstört wird
    healthcheck:        fn($r) => $r->ping(),           // Lebt die Ressource noch?
    beforeAcquire:      fn($r) => $r->isValid(),        // Prüfung vor der Ausgabe
    beforeRelease:      fn($r) => !$r->isBroken(),      // Prüfung vor der Rückgabe
    min:                2,                               // 2 Ressourcen vorab erstellen
    max:                10,                              // Maximal 10 Ressourcen
    healthcheckInterval: 30000,                          // Alle 30 Sek. prüfen
);
```

| Parameter              | Zweck                                                          | Standard |
|------------------------|----------------------------------------------------------------|----------|
| `factory`              | Erstellt eine neue Ressource. **Erforderlich**                 | --       |
| `destructor`           | Zerstört eine Ressource beim Entfernen aus dem Pool            | `null`   |
| `healthcheck`          | Periodische Prüfung: Lebt die Ressource noch?                 | `null`   |
| `beforeAcquire`        | Prüfung vor der Ausgabe. `false` -- zerstören und nächste nehmen | `null` |
| `beforeRelease`        | Prüfung vor der Rückgabe. `false` -- zerstören, nicht zurückgeben | `null` |
| `min`                  | Wie viele Ressourcen vorab erstellt werden (Pre-Warming)       | `0`      |
| `max`                  | Maximale Ressourcen (frei + in Verwendung)                     | `10`     |
| `healthcheckInterval`  | Intervall der Hintergrund-Gesundheitsprüfung (ms, 0 = deaktiviert) | `0`  |

## Acquire und Release

### Blockierendes Acquire

```php
// Warten, bis eine Ressource verfügbar ist (unbegrenzt)
$resource = $pool->acquire();

// Maximal 5 Sekunden warten
$resource = $pool->acquire(timeout: 5000);
```

Wenn der Pool voll ist (alle Ressourcen sind in Verwendung und `max` ist erreicht), wird die Koroutine **angehalten**
und wartet, bis eine andere Koroutine eine Ressource zurückgibt. Andere Koroutinen laufen weiter.

Bei Timeout wird eine `PoolException` geworfen.

### Nicht-blockierendes tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "Alle Ressourcen sind belegt, versuchen wir es später\n";
} else {
    // Ressource verwenden
    $pool->release($resource);
}
```

`tryAcquire()` gibt sofort `null` zurück, wenn keine Ressource verfügbar ist. Die Koroutine wird nicht angehalten.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // WICHTIG: Ressource immer an den Pool zurückgeben!
    $pool->release($resource);
}
```

Wenn `beforeRelease` gesetzt ist und `false` zurückgibt, gilt die Ressource als beschädigt
und wird zerstört, anstatt an den Pool zurückgegeben zu werden.

## Statistiken

```php
echo $pool->count();       // Gesamtressourcen (frei + in Verwendung)
echo $pool->idleCount();   // Frei, bereit zur Ausgabe
echo $pool->activeCount(); // Derzeit von Koroutinen verwendet
```

## Pool schließen

```php
$pool->close();
```

Beim Schließen:
- Alle wartenden Koroutinen erhalten eine `PoolException`
- Alle freien Ressourcen werden über den `destructor` zerstört
- Belegte Ressourcen werden beim anschließenden `release` zerstört

## Healthcheck: Hintergrundprüfung

Wenn `healthcheckInterval` gesetzt ist, prüft der Pool regelmäßig die freien Ressourcen.
Tote Ressourcen werden zerstört und durch neue ersetzt (wenn die Anzahl unter `min` gefallen ist).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Prüfung: Lebt die Verbindung noch?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Alle 10 Sekunden
);
```

Healthcheck funktioniert **nur** für freie Ressourcen. Belegte Ressourcen werden nicht geprüft.

## Circuit Breaker

Der Pool implementiert das **Circuit Breaker**-Muster zur Verwaltung der Dienstverfügbarkeit.

### Drei Zustände

| Zustand      | Verhalten                                              |
|--------------|--------------------------------------------------------|
| `ACTIVE`     | Alles funktioniert, Anfragen werden durchgelassen      |
| `INACTIVE`   | Dienst nicht verfügbar, `acquire()` wirft eine Ausnahme |
| `RECOVERING` | Testmodus, begrenzte Anfragen                          |

```php
use Async\CircuitBreakerState;

// Zustand prüfen
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Manuelle Steuerung
$pool->deactivate();  // Auf INACTIVE umschalten
$pool->recover();     // Auf RECOVERING umschalten
$pool->activate();    // Auf ACTIVE umschalten
```

### Automatische Verwaltung über Strategie

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

Die Strategie wird automatisch aufgerufen:
- `reportSuccess()` -- bei erfolgreicher Rückgabe der Ressource an den Pool
- `reportFailure()` -- wenn `beforeRelease` `false` zurückgibt (Ressource ist beschädigt)

## Ressourcenlebenszyklus

![Ressourcenlebenszyklus](/diagrams/de/components-pool/resource-lifecycle.svg)

## Praxisbeispiel: Redis-Verbindungspool

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 Koroutinen lesen gleichzeitig aus Redis über 20 Verbindungen
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO Pool

Für PDO gibt es eine integrierte Integration mit `Async\Pool`, die das Pooling vollständig transparent macht.
Anstelle von manuellem `acquire`/`release` wird der Pool automatisch im Hintergrund verwaltet.

Mehr erfahren: [PDO Pool](/de/docs/components/pdo-pool.html)

## Wie geht es weiter?

- [Async\Pool-Architektur](/de/architecture/pool.html) -- Interna, Diagramme, C API
- [PDO Pool](/de/docs/components/pdo-pool.html) -- transparenter Pool für PDO
- [Koroutinen](/de/docs/components/coroutines.html) -- wie Koroutinen funktionieren
- [Channels](/de/docs/components/channels.html) -- Datenaustausch zwischen Koroutinen
