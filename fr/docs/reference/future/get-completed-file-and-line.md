---
layout: docs
lang: fr
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /fr/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Emplacement de complétion du Future sous forme de tableau."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Retourne des informations sur l'emplacement où le `Future` a été complété (où `complete()` ou `fail()` a été appelé sur le `FutureState` associé). Contient le nom du fichier et le numéro de ligne. Utile pour le débogage et le traçage des chaînes asynchrones.

## Valeur de retour

`array` — un tableau avec les clés `file` (chaîne, chemin du fichier) et `line` (entier, numéro de ligne). Si le Future n'est pas encore complété, retourne un tableau vide.

## Exemples

### Exemple #1 Obtenir l'emplacement de complétion

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // line 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### Exemple #2 Comparaison des emplacements de création et de complétion

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## Voir aussi

- [Future::getCompletedLocation](/fr/docs/reference/future/get-completed-location.html) — Emplacement de complétion sous forme de chaîne
- [Future::getCreatedFileAndLine](/fr/docs/reference/future/get-created-file-and-line.html) — Emplacement de création du Future
- [Future::getAwaitingInfo](/fr/docs/reference/future/get-awaiting-info.html) — Informations sur les coroutines en attente
