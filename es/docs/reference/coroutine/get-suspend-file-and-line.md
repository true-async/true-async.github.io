---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Obtener el archivo y la línea donde la coroutine está suspendida."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Devuelve el archivo y el número de línea donde la coroutine fue suspendida (o fue suspendida por última vez).

## Valor de retorno

`array` -- un array de dos elementos:
- `[0]` -- nombre del archivo (`string` o `null`)
- `[1]` -- número de línea (`int`)

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // dejar que la coroutine se suspenda

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## Ver también

- [Coroutine::getSuspendLocation](/es/docs/reference/coroutine/get-suspend-location.html) -- Ubicación de suspensión como cadena
- [Coroutine::getSpawnFileAndLine](/es/docs/reference/coroutine/get-spawn-file-and-line.html) -- Archivo y línea de creación
