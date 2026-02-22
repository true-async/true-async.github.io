---
layout: docs
lang: es
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /es/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Registra un callback que se invoca cuando el ámbito finaliza."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Registra una función callback que se ejecutará cuando el ámbito finalice. Es el equivalente de un bloque `finally` para un ámbito, garantizando que el código de limpieza se ejecute independientemente de cómo terminó el ámbito (normalmente, por cancelación o con un error).

## Parámetros

`callback` — el closure que se llamará cuando el ámbito finalice.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Limpieza de recursos

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // Close connections, delete temporary files
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// Output: "Executing task"
// Output: "Scope completed, cleaning up resources"
```

### Ejemplo #2 Múltiples callbacks

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Both callbacks will be invoked when the scope completes
```

## Ver también

- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cerrar el ámbito
- [Scope::isFinished](/es/docs/reference/scope/is-finished.html) — Verificar si el ámbito ha finalizado
- [Coroutine::finally](/es/docs/reference/coroutine/on-finally.html) — Callback de finalización de corrutina
