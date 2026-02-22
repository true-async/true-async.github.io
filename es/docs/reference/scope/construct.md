---
layout: docs
lang: es
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /es/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Crea un nuevo Scope raíz."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Crea un nuevo `Scope` raíz. Un ámbito raíz no tiene ámbito padre y sirve como una unidad independiente para gestionar el ciclo de vida de las corrutinas.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### Ejemplo #2 Creación de múltiples ámbitos independientes

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// Cancelling one scope does not affect the other
$scopeA->cancel();

// $scopeB continues running
$scopeB->awaitCompletion();
```

## Ver también

- [Scope::inherit](/es/docs/reference/scope/inherit.html) — Crear un Scope hijo
- [Scope::spawn](/es/docs/reference/scope/spawn.html) — Lanzar una corrutina en el ámbito
