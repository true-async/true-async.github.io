---
layout: docs
lang: fr
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /fr/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Forcer le pool à l'état ACTIVE."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Force la transition du pool vers l'état `ACTIVE`. Les ressources redeviennent disponibles
à l'acquisition. Utilisé pour la gestion manuelle du Circuit Breaker, par exemple,
après avoir confirmé que le service a récupéré.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Activation manuelle après vérification

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Suppose the pool was deactivated
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Manually check service availability
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### Exemple #2 Activation par signal externe

```php
<?php

use Async\Pool;

// Webhook handler from the monitoring system
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## Voir aussi

- [Pool::deactivate](/fr/docs/reference/pool/deactivate.html) --- Transition vers l'état INACTIVE
- [Pool::recover](/fr/docs/reference/pool/recover.html) --- Transition vers l'état RECOVERING
- [Pool::getState](/fr/docs/reference/pool/get-state.html) --- État actuel
