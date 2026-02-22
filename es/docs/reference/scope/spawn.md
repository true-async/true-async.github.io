---
layout: docs
lang: es
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /es/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Lanza una corrutina en el ámbito dado."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Lanza una nueva corrutina dentro del ámbito dado. La corrutina estará vinculada al ámbito y será gestionada por su ciclo de vida: cuando el ámbito se cancele o cierre, todas sus corrutinas también se verán afectadas.

## Parámetros

`callable` — el closure que se ejecutará como corrutina.

`params` — argumentos que se pasarán al closure.

## Valor de retorno

`Coroutine` — el objeto de corrutina creado.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Ejemplo #2 Pasar parámetros

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... perform the request
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## Ver también

- [spawn()](/es/docs/reference/spawn.html) — Función global para lanzar corrutinas
- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar todas las corrutinas del ámbito
- [Scope::awaitCompletion](/es/docs/reference/scope/await-completion.html) — Esperar a la finalización de las corrutinas
