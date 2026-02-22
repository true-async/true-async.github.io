---
layout: docs
lang: es
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /es/docs/reference/future/map.html
page_title: "Future::map"
description: "Transformar el resultado del Future."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Transforma el resultado del `Future` usando una función callback. El callback recibe el valor del Future completado y devuelve un nuevo valor. Análogo a `then()` en APIs basadas en Promise. Si el Future original se completó con un error, el callback no se invoca y el error se pasa al nuevo Future.

## Parámetros

`map` — la función de transformación. Recibe el resultado del Future, devuelve un nuevo valor. Firma: `function(mixed $value): mixed`.

## Valor de retorno

`Future` — un nuevo Future que contiene el resultado transformado.

## Ejemplos

### Ejemplo #1 Transformar el resultado

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Resultado: $x");

echo $future->await(); // Resultado: 10
```

### Ejemplo #2 Cadena de transformaciones para carga asíncrona

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Número de usuarios: $count\n";
```

## Ver también

- [Future::catch](/es/docs/reference/future/catch.html) — Manejar un error del Future
- [Future::finally](/es/docs/reference/future/finally.html) — Callback al completar el Future
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado
