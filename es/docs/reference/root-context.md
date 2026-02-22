---
layout: docs
lang: es
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /es/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — obtener el contexto raíz global visible desde todos los scopes."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Devuelve el objeto `Async\Context` raíz global, compartido en toda la solicitud.

## Descripción

```php
root_context(): Async\Context
```

Devuelve el contexto de nivel superior. Los valores establecidos aquí son visibles a través de `find()` desde cualquier contexto en la jerarquía.

## Valores de retorno

Un objeto `Async\Context`.

## Ejemplos

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Establecer configuración global
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Accesible desde cualquier corrutina mediante find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## Ver también

- [current_context()](/es/docs/reference/current-context.html) — Contexto del Scope
- [coroutine_context()](/es/docs/reference/coroutine-context.html) — Contexto de la corrutina
- [Context](/es/docs/components/context.html) — El concepto de contexto
