---
layout: docs
lang: fr
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /fr/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Emplacement de création du Future sous forme de tableau."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Retourne des informations sur l'emplacement de création du `Future` sous forme de tableau. Contient le nom du fichier et le numéro de ligne où ce Future a été créé. Utile pour le débogage et le traçage.

## Valeur de retour

`array` — un tableau avec les clés `file` (chaîne, chemin du fichier) et `line` (entier, numéro de ligne).

## Exemples

### Exemple #1 Obtenir l'emplacement de création

```php
<?php

use Async\Future;

$future = Future::completed(42); // line 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### Exemple #2 Journalisation des informations du Future

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## Voir aussi

- [Future::getCreatedLocation](/fr/docs/reference/future/get-created-location.html) — Emplacement de création sous forme de chaîne
- [Future::getCompletedFileAndLine](/fr/docs/reference/future/get-completed-file-and-line.html) — Emplacement de complétion du Future
- [Future::getAwaitingInfo](/fr/docs/reference/future/get-awaiting-info.html) — Informations sur les coroutines en attente
