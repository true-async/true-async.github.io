---
layout: docs
lang: es
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /es/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Verifica si el Future está cancelado."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Verifica si el `Future` ha sido cancelado. Un Future se considera cancelado después de que se haya llamado al método `cancel()`.

## Valor de retorno

`bool` — `true` si el Future ha sido cancelado, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar la cancelación del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### Ejemplo #2 Diferencia entre completitud y cancelación

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## Ver también

- [Future::cancel](/es/docs/reference/future/cancel.html) — Cancelar el Future
- [Future::isCompleted](/es/docs/reference/future/is-completed.html) — Verificar si el Future está completado
