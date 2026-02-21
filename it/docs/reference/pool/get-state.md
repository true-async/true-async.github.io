---
layout: docs
lang: it
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /it/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Ottiene lo stato attuale del Circuit Breaker."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Restituisce lo stato attuale del Circuit Breaker del pool.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Un valore dell'enum `CircuitBreakerState`:

- `CircuitBreakerState::ACTIVE` --- il pool funziona normalmente, le risorse vengono erogate.
- `CircuitBreakerState::INACTIVE` --- il pool e' disattivato, le richieste vengono rifiutate.
- `CircuitBreakerState::RECOVERING` --- il pool e' in modalita' di ripristino, permettendo
  un numero limitato di richieste per verificare la disponibilita' del servizio.

## Esempi

### Esempio #1 Verifica dello stato del pool

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool is active\n",
    CircuitBreakerState::INACTIVE => echo "Service unavailable\n",
    CircuitBreakerState::RECOVERING => echo "Recovering...\n",
};
```

### Esempio #2 Logica condizionale basata sullo stato

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Usa i dati in cache invece di chiamare il servizio
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## Vedi anche

- [Pool::setCircuitBreakerStrategy](/it/docs/reference/pool/set-circuit-breaker-strategy.html) --- Imposta la strategia
- [Pool::activate](/it/docs/reference/pool/activate.html) --- Attivazione forzata
- [Pool::deactivate](/it/docs/reference/pool/deactivate.html) --- Disattivazione forzata
- [Pool::recover](/it/docs/reference/pool/recover.html) --- Transizione alla modalita' di ripristino
