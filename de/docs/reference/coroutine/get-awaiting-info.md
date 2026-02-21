---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Informationen darueber abrufen, worauf die Coroutine wartet."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Gibt Debug-Informationen darueber zurueck, worauf die Coroutine gerade wartet. Nuetzlich fuer die Diagnose blockierter Coroutinen.

## Rueckgabewert

`array` -- ein Array mit Warteinformationen. Ein leeres Array, wenn die Informationen nicht verfuegbar sind.

## Beispiele

### Beispiel #1 Wartezustand diagnostizieren

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
        echo "Coroutine #{$coro->getId()} wartet auf:\n";
        print_r($info);
    }
}
```

## Siehe auch

- [Coroutine::isSuspended](/de/docs/reference/coroutine/is-suspended.html) -- Unterbrechung pruefen
- [Coroutine::getTrace](/de/docs/reference/coroutine/get-trace.html) -- Aufrufstapel
- [Coroutine::getSuspendLocation](/de/docs/reference/coroutine/get-suspend-location.html) -- Unterbrechungsort
