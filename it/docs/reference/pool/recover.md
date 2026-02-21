---
layout: docs
lang: it
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /it/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Porta il pool nello stato RECOVERING."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Porta il pool nello stato `RECOVERING`. In questo stato, il pool consente
un numero limitato di richieste per verificare la disponibilita' del servizio.
Se le richieste hanno successo, il Circuit Breaker porta automaticamente
il pool nello stato `ACTIVE`. Se le richieste continuano a fallire,
il pool torna allo stato `INACTIVE`.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Tentativo di ripristino

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Il pool e' disattivato, tenta il ripristino
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // Il Circuit Breaker permettera' il passaggio delle richieste di prova
}
```

### Esempio #2 Tentativi di ripristino periodici

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // controlla ogni 10 secondi
    }
});
```

## Vedi anche

- [Pool::activate](/it/docs/reference/pool/activate.html) --- Attivazione forzata
- [Pool::deactivate](/it/docs/reference/pool/deactivate.html) --- Disattivazione forzata
- [Pool::getState](/it/docs/reference/pool/get-state.html) --- Stato attuale
- [Pool::setCircuitBreakerStrategy](/it/docs/reference/pool/set-circuit-breaker-strategy.html) --- Configura la strategia
