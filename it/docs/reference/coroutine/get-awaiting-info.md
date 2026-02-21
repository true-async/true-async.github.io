---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Ottieni informazioni su cosa sta attendendo la coroutine."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Restituisce informazioni di debug su cosa sta attualmente attendendo la coroutine. Utile per diagnosticare coroutine bloccate.

## Valore di ritorno

`array` -- un array con informazioni sull'attesa. Un array vuoto se l'informazione non è disponibile.

## Esempi

### Esempio #1 Diagnosi dello stato di attesa

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
        echo "Coroutine #{$coro->getId()} sta attendendo:\n";
        print_r($info);
    }
}
```

## Vedi anche

- [Coroutine::isSuspended](/it/docs/reference/coroutine/is-suspended.html) -- Verifica la sospensione
- [Coroutine::getTrace](/it/docs/reference/coroutine/get-trace.html) -- Stack delle chiamate
- [Coroutine::getSuspendLocation](/it/docs/reference/coroutine/get-suspend-location.html) -- Posizione di sospensione
