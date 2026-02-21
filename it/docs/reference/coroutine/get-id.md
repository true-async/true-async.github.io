---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Ottieni l'identificatore univoco di una coroutine."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Restituisce l'identificatore intero univoco della coroutine. L'identificatore è univoco all'interno del processo PHP corrente.

## Valore di ritorno

`int` -- identificatore univoco della coroutine.

## Esempi

### Esempio #1 Uso base

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Esempio #2 Logging con identificatore

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' avviato\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completato\n";
    });
}
```

## Vedi anche

- [Coroutine::getSpawnLocation](/it/docs/reference/coroutine/get-spawn-location.html) -- Posizione di creazione della coroutine
- [current_coroutine()](/it/docs/reference/current-coroutine.html) -- Ottieni la coroutine corrente
