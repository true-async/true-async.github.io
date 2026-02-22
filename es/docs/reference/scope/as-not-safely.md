---
layout: docs
lang: es
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /es/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Marca el ámbito como no seguro — las corrutinas reciben cancelación en lugar de convertirse en zombis."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Marca el ámbito como "no seguro". Cuando se llama a `disposeSafely()` en dicho ámbito, las corrutinas **no** se convierten en zombis, sino que reciben una señal de cancelación. Esto es útil para tareas en segundo plano que no requieren finalización garantizada.

El método devuelve el mismo objeto de ámbito, lo que permite el encadenamiento de métodos (interfaz fluida).

## Valor de retorno

`Scope` — el mismo objeto de ámbito (para encadenamiento de métodos).

## Ejemplos

### Ejemplo #1 Ámbito para tareas en segundo plano

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Background task: cache cleanup
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// With disposeSafely(), coroutines will be cancelled instead of becoming zombies
$scope->disposeSafely();
```

### Ejemplo #2 Uso con inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// On close: coroutines will be cancelled, not turned into zombies
$bgScope->disposeSafely();
```

## Ver también

- [Scope::disposeSafely](/es/docs/reference/scope/dispose-safely.html) — Cerrar el ámbito de forma segura
- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cerrar el ámbito de forma forzada
- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar todas las corrutinas
