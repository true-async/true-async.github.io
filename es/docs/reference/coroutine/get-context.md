---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Obtener el contexto local de una coroutine."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Devuelve el contexto local de la coroutine. El contexto se crea de forma diferida en el primer acceso.

El contexto permite almacenar datos vinculados a una coroutine específica y pasarlos a las coroutines hijas.

## Valor de retorno

`Async\Context` -- el objeto de contexto de la coroutine.

## Ejemplos

### Ejemplo #1 Acceder al contexto

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## Ver también

- [Context](/es/docs/components/context.html) -- Concepto de contexto
- [current_context()](/es/docs/reference/current-context.html) -- Obtener el contexto de la coroutine actual
