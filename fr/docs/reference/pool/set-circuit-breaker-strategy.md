---
layout: docs
lang: fr
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /fr/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Définir la stratégie du Circuit Breaker pour le pool."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Définit la stratégie du Circuit Breaker pour le pool. Le Circuit Breaker surveille
la disponibilité d'un service externe : en cas de détection de multiples échecs, le pool
passe automatiquement à l'état `INACTIVE`, empêchant une cascade d'erreurs.
Lorsque le service récupère, le pool revient à l'état actif.

## Paramètres

**strategy**
: Un objet `CircuitBreakerStrategy` définissant les règles de transition
  entre les états. `null` --- désactiver le Circuit Breaker.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Définition d'une stratégie

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
    failureThreshold: 5,       // after 5 errors — deactivate
    recoveryTimeout: 30000,    // after 30 seconds — attempt recovery
    successThreshold: 3        // 3 successful requests — full activation
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Exemple #2 Désactivation du Circuit Breaker

```php
<?php

use Async\Pool;

// Disable the strategy
$pool->setCircuitBreakerStrategy(null);
```

## Voir aussi

- [Pool::getState](/fr/docs/reference/pool/get-state.html) --- État actuel du Circuit Breaker
- [Pool::activate](/fr/docs/reference/pool/activate.html) --- Activation forcée
- [Pool::deactivate](/fr/docs/reference/pool/deactivate.html) --- Désactivation forcée
- [Pool::recover](/fr/docs/reference/pool/recover.html) --- Transition vers le mode récupération
