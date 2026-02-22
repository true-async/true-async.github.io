---
layout: docs
lang: es
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /es/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Verifica si el ámbito ha finalizado."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Verifica si todas las corrutinas del ámbito han finalizado. Un ámbito se considera finalizado cuando todas sus corrutinas (incluidos los ámbitos hijos) han completado su ejecución.

## Valor de retorno

`bool` — `true` si todas las corrutinas del ámbito han finalizado, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar la finalización del ámbito

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## Ver también

- [Scope::isClosed](/es/docs/reference/scope/is-closed.html) — Verificar si el ámbito está cerrado
- [Scope::isCancelled](/es/docs/reference/scope/is-cancelled.html) — Verificar si el ámbito está cancelado
- [Scope::awaitCompletion](/es/docs/reference/scope/await-completion.html) — Esperar a la finalización de las corrutinas
