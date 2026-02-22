---
layout: docs
lang: es
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /es/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — obtener el contexto del Scope actual."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Devuelve el objeto `Async\Context` vinculado al Scope actual.

## Descripción

```php
current_context(): Async\Context
```

Si el contexto para el Scope actual aún no se ha creado, se crea automáticamente.
Los valores establecidos en este contexto son visibles para todas las corrutinas en el Scope actual a través de `find()`.

## Valores de retorno

Un objeto `Async\Context`.

## Ejemplos

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Ve el valor del scope padre
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## Ver también

- [coroutine_context()](/es/docs/reference/coroutine-context.html) — Contexto de la corrutina
- [root_context()](/es/docs/reference/root-context.html) — Contexto global
- [Context](/es/docs/components/context.html) — El concepto de contexto
