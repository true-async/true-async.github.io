---
layout: docs
lang: es
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /es/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — obtener el contexto privado de la corrutina actual."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Devuelve el objeto `Async\Context` vinculado a la corrutina actual.

## Descripción

```php
coroutine_context(): Async\Context
```

Devuelve el contexto **privado** de la corrutina actual. Los datos establecidos aquí no son visibles para otras corrutinas. Si el contexto para la corrutina aún no se ha creado, se crea automáticamente.

## Valores de retorno

Un objeto `Async\Context`.

## Ejemplos

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Más adelante en la misma corrutina
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // No puede ver 'step' de otra corrutina
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## Ver también

- [current_context()](/es/docs/reference/current-context.html) — Contexto del Scope
- [root_context()](/es/docs/reference/root-context.html) — Contexto global
- [Context](/es/docs/components/context.html) — El concepto de contexto
