---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Obtenir des informations sur ce que la coroutine attend."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Retourne des informations de débogage sur ce que la coroutine attend actuellement. Utile pour diagnostiquer les coroutines bloquées.

## Valeur de retour

`array` -- un tableau contenant les informations d'attente. Un tableau vide si l'information n'est pas disponible.

## Exemples

### Exemple #1 Diagnostic de l'état d'attente

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## Voir aussi

- [Coroutine::isSuspended](/fr/docs/reference/coroutine/is-suspended.html) -- Vérifier la suspension
- [Coroutine::getTrace](/fr/docs/reference/coroutine/get-trace.html) -- Pile d'appels
- [Coroutine::getSuspendLocation](/fr/docs/reference/coroutine/get-suspend-location.html) -- Emplacement de suspension
