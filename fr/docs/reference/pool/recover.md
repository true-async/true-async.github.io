---
layout: docs
lang: fr
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /fr/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Faire passer le pool à l'état RECOVERING."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Fait passer le pool à l'état `RECOVERING`. Dans cet état, le pool autorise
un nombre limité de requêtes à passer pour vérifier la disponibilité du service.
Si les requêtes réussissent, le Circuit Breaker fait automatiquement passer
le pool à l'état `ACTIVE`. Si les requêtes continuent d'échouer,
le pool retourne à l'état `INACTIVE`.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Tentative de récupération

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Pool is deactivated, try to recover
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // Circuit Breaker will allow probe requests through
}
```

### Exemple #2 Tentatives périodiques de récupération

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // check every 10 seconds
    }
});
```

## Voir aussi

- [Pool::activate](/fr/docs/reference/pool/activate.html) --- Activation forcée
- [Pool::deactivate](/fr/docs/reference/pool/deactivate.html) --- Désactivation forcée
- [Pool::getState](/fr/docs/reference/pool/get-state.html) --- État actuel
- [Pool::setCircuitBreakerStrategy](/fr/docs/reference/pool/set-circuit-breaker-strategy.html) --- Configurer la stratégie
