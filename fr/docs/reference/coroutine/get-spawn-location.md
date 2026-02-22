---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Obtenir l'emplacement de création de la coroutine sous forme de chaîne."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Retourne l'emplacement de création de la coroutine au format `"fichier:ligne"`. Si l'information n'est pas disponible, retourne `"unknown"`.

## Valeur de retour

`string` -- une chaîne comme `"/app/script.php:42"` ou `"unknown"`.

## Exemples

### Exemple #1 Sortie de débogage

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### Exemple #2 Journalisation de toutes les coroutines

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## Voir aussi

- [Coroutine::getSpawnFileAndLine](/fr/docs/reference/coroutine/get-spawn-file-and-line.html) -- Fichier et ligne sous forme de tableau
- [Coroutine::getSuspendLocation](/fr/docs/reference/coroutine/get-suspend-location.html) -- Emplacement de suspension
- [get_coroutines()](/fr/docs/reference/get-coroutines.html) -- Toutes les coroutines actives
