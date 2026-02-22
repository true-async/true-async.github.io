---
layout: docs
lang: es
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /es/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Espera a que las corrutinas activas del ámbito finalicen."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Espera a que todas las corrutinas **activas** del ámbito finalicen. Las corrutinas zombis no se consideran durante la espera. El parámetro `$cancellation` permite interrumpir la espera de forma anticipada.

## Parámetros

`cancellation` — un objeto `Awaitable` que, al activarse, interrumpirá la espera.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Esperar a que todas las corrutinas finalicen

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// Wait for completion with a 5-second timeout
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### Ejemplo #2 Interrumpir la espera

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Very long task
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## Ver también

- [Scope::awaitAfterCancellation](/es/docs/reference/scope/await-after-cancellation.html) — Esperar a todas las corrutinas incluidas las zombis
- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar todas las corrutinas
- [Scope::isFinished](/es/docs/reference/scope/is-finished.html) — Verificar si el ámbito ha finalizado
