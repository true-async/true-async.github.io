---
layout: docs
lang: es
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /es/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — obtener el objeto de la corrutina en ejecución actualmente."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Devuelve el objeto de la corrutina en ejecución actualmente.

## Descripción

```php
current_coroutine(): Async\Coroutine
```

## Valores de retorno

Un objeto `Async\Coroutine` que representa la corrutina actual.

## Errores/Excepciones

`Async\AsyncException` — si se llama fuera de una corrutina.

## Ejemplos

### Ejemplo #1 Obtener el ID de la corrutina

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Corrutina #" . $coro->getId() . "\n";
});
?>
```

### Ejemplo #2 Diagnóstico

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Creada en: " . $coro->getSpawnLocation() . "\n";
    echo "Estado: " . ($coro->isRunning() ? 'ejecutándose' : 'suspendida') . "\n";
});
?>
```

## Ver también

- [get_coroutines()](/es/docs/reference/get-coroutines.html) — lista de todas las corrutinas
- [Corrutinas](/es/docs/components/coroutines.html) — el concepto de corrutina
