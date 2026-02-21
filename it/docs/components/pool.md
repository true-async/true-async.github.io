---
layout: docs
lang: it
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /it/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- pool universale di risorse per le coroutine: creazione, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool: Pool Universale di Risorse

## Perché Serve un Pool

Quando si lavora con le coroutine, sorge il problema della condivisione dei descrittori di I/O.
Se lo stesso socket viene usato da due coroutine che contemporaneamente scrivono o leggono
pacchetti diversi da esso, i dati si mescolano e il risultato è imprevedibile.
Pertanto, non puoi semplicemente usare lo stesso oggetto `PDO` in diverse coroutine!

D'altra parte, creare una connessione separata per ogni coroutine è una strategia molto dispendiosa.
Annulla i vantaggi dell'I/O concorrente. Pertanto, tipicamente si usano pool di connessioni
per interagire con API esterne, database e altre risorse.

Un pool risolve questo problema: le risorse vengono create in anticipo, fornite alle coroutine su richiesta,
e restituite per il riutilizzo.

```php
use Async\Pool;

// Pool di connessioni HTTP
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Una coroutine prende una connessione, la usa e la restituisce
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Creazione di un Pool

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Come creare una risorsa
    destructor:         fn($r) => $r->close(),          // Come distruggere una risorsa
    healthcheck:        fn($r) => $r->ping(),           // La risorsa è attiva?
    beforeAcquire:      fn($r) => $r->isValid(),        // Controllo prima della consegna
    beforeRelease:      fn($r) => !$r->isBroken(),      // Controllo prima della restituzione
    min:                2,                               // Pre-crea 2 risorse
    max:                10,                              // Massimo 10 risorse
    healthcheckInterval: 30000,                          // Controllo ogni 30 sec
);
```

| Parametro              | Scopo                                                          | Predefinito |
|------------------------|----------------------------------------------------------------|-------------|
| `factory`              | Crea una nuova risorsa. **Obbligatorio**                       | --          |
| `destructor`           | Distrugge una risorsa quando viene rimossa dal pool            | `null`      |
| `healthcheck`          | Controllo periodico: la risorsa è ancora attiva?               | `null`      |
| `beforeAcquire`        | Controllo prima della consegna. `false` -- distruggi e prendi la prossima | `null` |
| `beforeRelease`        | Controllo prima della restituzione. `false` -- distruggi, non restituire | `null` |
| `min`                  | Quante risorse creare in anticipo (pre-warming)                | `0`         |
| `max`                  | Risorse massime (libere + in uso)                              | `10`        |
| `healthcheckInterval`  | Intervallo di health check in background (ms, 0 = disabilitato) | `0`       |

## Acquire e Release

### Acquire Bloccante

```php
// Attendi finché una risorsa non diventa disponibile (indefinitamente)
$resource = $pool->acquire();

// Attendi al massimo 5 secondi
$resource = $pool->acquire(timeout: 5000);
```

Se il pool è pieno (tutte le risorse sono in uso e `max` è raggiunto), la coroutine **si sospende**
e attende finché un'altra coroutine non restituisce una risorsa. Le altre coroutine continuano a funzionare.

Al timeout, viene lanciata una `PoolException`.

### tryAcquire Non Bloccante

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "Tutte le risorse sono occupate, riproviamo dopo\n";
} else {
    // Usa la risorsa
    $pool->release($resource);
}
```

`tryAcquire()` restituisce `null` immediatamente se una risorsa non è disponibile. La coroutine non viene sospesa.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // IMPORTANTE: restituisci sempre la risorsa al pool!
    $pool->release($resource);
}
```

Se `beforeRelease` è impostato e restituisce `false`, la risorsa è considerata danneggiata
e viene distrutta invece di essere restituita al pool.

## Statistiche

```php
echo $pool->count();       // Risorse totali (libere + in uso)
echo $pool->idleCount();   // Libere, pronte per la consegna
echo $pool->activeCount(); // Attualmente in uso dalle coroutine
```

## Chiusura del Pool

```php
$pool->close();
```

Alla chiusura:
- Tutte le coroutine in attesa ricevono una `PoolException`
- Tutte le risorse libere vengono distrutte tramite `destructor`
- Le risorse occupate vengono distrutte al successivo `release`

## Healthcheck: Controllo in Background

Se `healthcheckInterval` è impostato, il pool controlla periodicamente le risorse libere.
Le risorse morte vengono distrutte e sostituite con nuove (se il conteggio è sceso sotto `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Controllo: la connessione è attiva?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Ogni 10 secondi
);
```

L'healthcheck funziona **solo** per le risorse libere. Le risorse occupate non vengono controllate.

## Circuit Breaker

Il pool implementa il pattern **Circuit Breaker** per gestire la disponibilità del servizio.

### Tre Stati

| Stato        | Comportamento                                         |
|--------------|-------------------------------------------------------|
| `ACTIVE`     | Tutto funziona, le richieste passano                  |
| `INACTIVE`   | Servizio non disponibile, `acquire()` lancia un'eccezione |
| `RECOVERING` | Modalità test, richieste limitate                     |

```php
use Async\CircuitBreakerState;

// Verifica lo stato
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Controllo manuale
$pool->deactivate();  // Passa a INACTIVE
$pool->recover();     // Passa a RECOVERING
$pool->activate();    // Passa a ACTIVE
```

### Gestione Automatica tramite Strategia

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

La strategia viene chiamata automaticamente:
- `reportSuccess()` -- alla restituzione riuscita della risorsa al pool
- `reportFailure()` -- quando `beforeRelease` restituisce `false` (risorsa danneggiata)

## Ciclo di Vita della Risorsa

![Ciclo di Vita della Risorsa](/diagrams/it/components-pool/resource-lifecycle.svg)

## Esempio Reale: Pool di Connessioni Redis

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

// 100 coroutine leggono concorrentemente da Redis attraverso 20 connessioni
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

Per PDO, esiste un'integrazione built-in con `Async\Pool` che rende il pooling completamente trasparente.
Invece di `acquire`/`release` manuali, il pool viene gestito automaticamente dietro le quinte.

Scopri di più: [PDO Pool](/it/docs/components/pdo-pool.html)

## Cosa Leggere Dopo?

- [Architettura di Async\Pool](/it/architecture/pool.html) -- internals, diagrammi, API C
- [PDO Pool](/it/docs/components/pdo-pool.html) -- pool trasparente per PDO
- [Coroutine](/it/docs/components/coroutines.html) -- come funzionano le coroutine
- [Canali](/it/docs/components/channels.html) -- scambio di dati tra coroutine
