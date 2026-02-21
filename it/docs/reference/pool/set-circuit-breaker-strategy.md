---
layout: docs
lang: it
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /it/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Imposta la strategia del Circuit Breaker per il pool."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Imposta la strategia del Circuit Breaker per il pool. Il Circuit Breaker monitora
la disponibilita' di un servizio esterno: al rilevamento di molteplici errori, il pool
passa automaticamente allo stato `INACTIVE`, prevenendo una cascata di errori.
Quando il servizio si riprende, il pool torna allo stato attivo.

## Parametri

**strategy**
: Un oggetto `CircuitBreakerStrategy` che definisce le regole di transizione
  tra gli stati. `null` --- disabilita il Circuit Breaker.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Impostazione di una strategia

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // dopo 5 errori — disattiva
    recoveryTimeout: 30000,    // dopo 30 secondi — tenta il ripristino
    successThreshold: 3        // 3 richieste riuscite — attivazione completa
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Esempio #2 Disabilitazione del Circuit Breaker

```php
<?php

use Async\Pool;

// Disabilita la strategia
$pool->setCircuitBreakerStrategy(null);
```

## Vedi anche

- [Pool::getState](/it/docs/reference/pool/get-state.html) --- Stato attuale del Circuit Breaker
- [Pool::activate](/it/docs/reference/pool/activate.html) --- Attivazione forzata
- [Pool::deactivate](/it/docs/reference/pool/deactivate.html) --- Disattivazione forzata
- [Pool::recover](/it/docs/reference/pool/recover.html) --- Transizione alla modalita' di ripristino
