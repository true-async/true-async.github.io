---
layout: docs
lang: es
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /es/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Cierra el ámbito después de un tiempo límite especificado."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Programa el cierre del ámbito después de un tiempo límite especificado. Cuando expira el tiempo, se llama a `dispose()`, cancelando todas las corrutinas y cerrando el ámbito. Esto es conveniente para establecer un tiempo de vida máximo del ámbito.

## Parámetros

`timeout` — tiempo en milisegundos antes de que el ámbito se cierre automáticamente.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Limitar el tiempo de ejecución

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope will be closed after 10 seconds
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Long operation
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### Ejemplo #2 Ámbito con tiempo de vida limitado

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 seconds for all work

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Won't finish in time
    echo "Task 3: OK\n"; // Will not be printed
});

$scope->awaitCompletion();
```

## Ver también

- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cierre inmediato del ámbito
- [Scope::disposeSafely](/es/docs/reference/scope/dispose-safely.html) — Cierre seguro del ámbito
- [timeout()](/es/docs/reference/timeout.html) — Función global de tiempo límite
