---
layout: docs
lang: fr
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /fr/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Emplacement de création du Future sous forme de chaîne."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Retourne des informations sur l'emplacement de création du `Future` sous forme de chaîne formatée. Pratique pour la journalisation et la sortie de débogage.

## Valeur de retour

`string` — une chaîne au format `file:line`, par exemple `/app/script.php:42`.

## Exemples

### Exemple #1 Obtenir l'emplacement de création sous forme de chaîne

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Exemple #2 Utilisation dans les messages de débogage

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Debug long-running Futures
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## Voir aussi

- [Future::getCreatedFileAndLine](/fr/docs/reference/future/get-created-file-and-line.html) — Emplacement de création sous forme de tableau
- [Future::getCompletedLocation](/fr/docs/reference/future/get-completed-location.html) — Emplacement de complétion sous forme de chaîne
- [Future::getAwaitingInfo](/fr/docs/reference/future/get-awaiting-info.html) — Informations sur les coroutines en attente
