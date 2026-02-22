---
layout: docs
lang: fr
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /fr/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Obtenir l'état actuel du Circuit Breaker."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Retourne l'état actuel du Circuit Breaker du pool.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Une valeur de l'enum `CircuitBreakerState` :

- `CircuitBreakerState::ACTIVE` --- le pool fonctionne normalement, les ressources sont distribuées.
- `CircuitBreakerState::INACTIVE` --- le pool est désactivé, les requêtes sont rejetées.
- `CircuitBreakerState::RECOVERING` --- le pool est en mode récupération, autorisant
  un nombre limité de requêtes pour vérifier la disponibilité du service.

## Exemples

### Exemple #1 Vérification de l'état du pool

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

### Exemple #2 Logique conditionnelle basée sur l'état

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Use cached data instead of calling the service
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

## Voir aussi

- [Pool::setCircuitBreakerStrategy](/fr/docs/reference/pool/set-circuit-breaker-strategy.html) --- Définir la stratégie
- [Pool::activate](/fr/docs/reference/pool/activate.html) --- Activation forcée
- [Pool::deactivate](/fr/docs/reference/pool/deactivate.html) --- Désactivation forcée
- [Pool::recover](/fr/docs/reference/pool/recover.html) --- Transition vers le mode récupération
