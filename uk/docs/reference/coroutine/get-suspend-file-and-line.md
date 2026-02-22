---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Отримати файл і рядок, де корутину було призупинено."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Повертає файл і номер рядка, де корутину було призупинено (або де вона була призупинена востаннє).

## Значення, що повертається

`array` -- масив з двох елементів:
- `[0]` -- ім'я файлу (`string` або `null`)
- `[1]` -- номер рядка (`int`)

## Приклади

### Приклад #1 Базове використання

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // дозволити корутині призупинитися

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## Дивіться також

- [Coroutine::getSuspendLocation](/uk/docs/reference/coroutine/get-suspend-location.html) -- Місце призупинення у вигляді рядка
- [Coroutine::getSpawnFileAndLine](/uk/docs/reference/coroutine/get-spawn-file-and-line.html) -- Файл і рядок створення
