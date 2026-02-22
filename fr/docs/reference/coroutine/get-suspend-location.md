---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Obtenir l'emplacement de suspension de la coroutine sous forme de chaîne."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Retourne l'emplacement de suspension de la coroutine au format `"fichier:ligne"`. Si l'information n'est pas disponible, retourne `"unknown"`.

## Valeur de retour

`string` -- une chaîne comme `"/app/script.php:42"` ou `"unknown"`.

## Exemples

### Exemple #1 Diagnostic d'une coroutine bloquée

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // bloquée ici
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## Voir aussi

- [Coroutine::getSuspendFileAndLine](/fr/docs/reference/coroutine/get-suspend-file-and-line.html) -- Fichier et ligne sous forme de tableau
- [Coroutine::getSpawnLocation](/fr/docs/reference/coroutine/get-spawn-location.html) -- Emplacement de création
- [Coroutine::getTrace](/fr/docs/reference/coroutine/get-trace.html) -- Pile d'appels complète
