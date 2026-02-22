---
layout: docs
lang: es
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /es/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Verifica si el ámbito está cancelado."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Verifica si el ámbito ha sido cancelado. Un ámbito se marca como cancelado después de una llamada a `cancel()` o `dispose()`.

## Valor de retorno

`bool` — `true` si el ámbito ha sido cancelado, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar la cancelación del ámbito

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## Ver también

- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar el ámbito
- [Scope::isFinished](/es/docs/reference/scope/is-finished.html) — Verificar si el ámbito ha finalizado
- [Scope::isClosed](/es/docs/reference/scope/is-closed.html) — Verificar si el ámbito está cerrado
