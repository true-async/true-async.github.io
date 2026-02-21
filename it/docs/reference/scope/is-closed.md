---
layout: docs
lang: it
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Verifica se lo scope e' chiuso."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Verifica se lo scope e' chiuso. Uno scope e' considerato chiuso dopo una chiamata a `dispose()` o `disposeSafely()`. Non e' possibile aggiungere nuove coroutine a uno scope chiuso.

## Valore di ritorno

`bool` — `true` se lo scope e' chiuso, `false` altrimenti.

## Esempi

### Esempio #1 Verifica dello stato dello scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Esempio #2 Protezione contro l'aggiunta a uno scope chiuso

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "Questa coroutine non verra' creata\n";
    });
} else {
    echo "Lo scope e' gia' chiuso\n";
}
```

## Vedi anche

- [Scope::isFinished](/it/docs/reference/scope/is-finished.html) — Verifica se lo scope e' terminato
- [Scope::isCancelled](/it/docs/reference/scope/is-cancelled.html) — Verifica se lo scope e' stato cancellato
- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Chiudi lo scope
