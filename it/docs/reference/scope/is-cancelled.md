---
layout: docs
lang: it
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /it/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Verifica se lo scope e' stato cancellato."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Verifica se lo scope e' stato cancellato. Uno scope viene contrassegnato come cancellato dopo una chiamata a `cancel()` o `dispose()`.

## Valore di ritorno

`bool` — `true` se lo scope e' stato cancellato, `false` altrimenti.

## Esempi

### Esempio #1 Verifica della cancellazione dello scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## Vedi anche

- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella lo scope
- [Scope::isFinished](/it/docs/reference/scope/is-finished.html) — Verifica se lo scope e' terminato
- [Scope::isClosed](/it/docs/reference/scope/is-closed.html) — Verifica se lo scope e' chiuso
