---
layout: docs
lang: fr
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /fr/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Forcer le pool à l'état INACTIVE."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Force la transition du pool vers l'état `INACTIVE`. Dans cet état,
le pool rejette toutes les demandes d'acquisition de ressources. Utilisé pour la
désactivation manuelle lorsque des problèmes avec un service externe sont détectés.

Contrairement à `close()`, la désactivation est réversible --- le pool peut être remis
en état de fonctionnement via `activate()` ou `recover()`.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Désactivation lors de la détection d'un problème

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Upon detecting a critical error
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### Exemple #2 Maintenance planifiée

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## Voir aussi

- [Pool::activate](/fr/docs/reference/pool/activate.html) --- Transition vers l'état ACTIVE
- [Pool::recover](/fr/docs/reference/pool/recover.html) --- Transition vers l'état RECOVERING
- [Pool::getState](/fr/docs/reference/pool/get-state.html) --- État actuel
- [Pool::close](/fr/docs/reference/pool/close.html) --- Fermeture permanente du pool (irréversible)
