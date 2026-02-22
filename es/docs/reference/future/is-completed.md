---
layout: docs
lang: es
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /es/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Verifica si el Future está completado."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Verifica si el `Future` está completado. Un Future se considera completado si contiene un resultado, un error o ha sido cancelado.

## Valor de retorno

`bool` — `true` si el Future está completado (exitosamente, con un error o cancelado), `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar la completitud del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### Ejemplo #2 Verificar métodos de fábrica estáticos

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## Ver también

- [Future::isCancelled](/es/docs/reference/future/is-cancelled.html) — Verificar si el Future está cancelado
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado del Future
