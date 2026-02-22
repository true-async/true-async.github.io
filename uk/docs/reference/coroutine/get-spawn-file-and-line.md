---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Отримати файл і рядок, де було створено корутину."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Повертає файл і номер рядка, де було викликано `spawn()` для створення цієї корутини.

## Значення, що повертається

`array` -- масив з двох елементів:
- `[0]` -- ім'я файлу (`string` або `null`)
- `[1]` -- номер рядка (`int`)

## Приклади

### Приклад #1 Базове використання

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## Дивіться також

- [Coroutine::getSpawnLocation](/uk/docs/reference/coroutine/get-spawn-location.html) -- Місце створення у вигляді рядка
- [Coroutine::getSuspendFileAndLine](/uk/docs/reference/coroutine/get-suspend-file-and-line.html) -- Файл і рядок призупинення
