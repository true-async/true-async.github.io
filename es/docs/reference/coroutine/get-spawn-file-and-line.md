---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Obtener el archivo y la línea donde se creó la coroutine."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Devuelve el archivo y el número de línea donde se llamó a `spawn()` para crear esta coroutine.

## Valor de retorno

`array` -- un array de dos elementos:
- `[0]` -- nombre del archivo (`string` o `null`)
- `[1]` -- número de línea (`int`)

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## Ver también

- [Coroutine::getSpawnLocation](/es/docs/reference/coroutine/get-spawn-location.html) -- Ubicación de creación como cadena
- [Coroutine::getSuspendFileAndLine](/es/docs/reference/coroutine/get-suspend-file-and-line.html) -- Archivo y línea de suspensión
