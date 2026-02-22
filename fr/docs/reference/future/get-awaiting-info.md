---
layout: docs
lang: fr
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /fr/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Informations de débogage sur les coroutines en attente."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Retourne des informations de débogage sur les coroutines qui attendent actuellement la complétion de ce `Future`. Utile pour diagnostiquer les deadlocks et analyser les dépendances entre coroutines.

## Valeur de retour

`array` — un tableau avec des informations sur les coroutines en attente.

## Exemples

### Exemple #1 Obtenir les informations sur les coroutines en attente

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Launch several coroutines awaiting one Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Give coroutines time to start waiting
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array with information about awaiting coroutines

$state->complete("done");
```

## Voir aussi

- [Future::getCreatedFileAndLine](/fr/docs/reference/future/get-created-file-and-line.html) — Emplacement de création du Future
- [Future::getCreatedLocation](/fr/docs/reference/future/get-created-location.html) — Emplacement de création sous forme de chaîne
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat
