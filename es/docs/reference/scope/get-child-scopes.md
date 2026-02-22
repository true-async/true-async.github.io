---
layout: docs
lang: es
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /es/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Devuelve un array de ámbitos hijos."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Devuelve un array con todos los ámbitos hijos creados mediante `Scope::inherit()` a partir del ámbito dado. Útil para monitoreo y depuración de la jerarquía de ámbitos.

## Valor de retorno

`array` — un array de objetos `Scope` que son hijos del ámbito dado.

## Ejemplos

### Ejemplo #1 Obtener ámbitos hijos

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Ejemplo #2 Monitorear el estado de los ámbitos hijos

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancelled',
        $child->isFinished()  => 'finished',
        $child->isClosed()    => 'closed',
        default               => 'active',
    };
    echo "Scope: $status\n";
}
```

## Ver también

- [Scope::inherit](/es/docs/reference/scope/inherit.html) — Crear un ámbito hijo
- [Scope::setChildScopeExceptionHandler](/es/docs/reference/scope/set-child-scope-exception-handler.html) — Manejador de excepciones para ámbitos hijos
