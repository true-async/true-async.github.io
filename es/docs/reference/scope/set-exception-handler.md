---
layout: docs
lang: es
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /es/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Establece un manejador de excepciones para las corrutinas hijas."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Establece un manejador de excepciones para las excepciones lanzadas en las corrutinas hijas del ámbito. Cuando una corrutina termina con una excepción no manejada, en lugar de que el error se propague hacia arriba, se llama al manejador especificado.

## Parámetros

`exceptionHandler` — la función de manejo de excepciones. Acepta un `\Throwable` como argumento.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Manejo de errores de corrutinas

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// Log will contain: "Coroutine error: Something went wrong"
```

### Ejemplo #2 Registro centralizado de errores

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## Ver también

- [Scope::setChildScopeExceptionHandler](/es/docs/reference/scope/set-child-scope-exception-handler.html) — Manejador de excepciones para ámbitos hijos
- [Scope::finally](/es/docs/reference/scope/on-finally.html) — Callback de finalización del ámbito
