---
layout: docs
lang: fr
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /fr/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Emplacement de complétion du Future sous forme de chaîne."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Retourne des informations sur l'emplacement de complétion du `Future` sous forme de chaîne formatée. Pratique pour la journalisation et le débogage.

## Valeur de retour

`string` — une chaîne au format `file:line`, par exemple `/app/worker.php:15`. Si le Future n'est pas encore complété, retourne une chaîne vide.

## Exemples

### Exemple #1 Obtenir l'emplacement de complétion sous forme de chaîne

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Exemple #2 Traçage complet du cycle de vie d'un Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## Voir aussi

- [Future::getCompletedFileAndLine](/fr/docs/reference/future/get-completed-file-and-line.html) — Emplacement de complétion sous forme de tableau
- [Future::getCreatedLocation](/fr/docs/reference/future/get-created-location.html) — Emplacement de création sous forme de chaîne
- [Future::getAwaitingInfo](/fr/docs/reference/future/get-awaiting-info.html) — Informations sur les coroutines en attente
