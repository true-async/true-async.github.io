---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Получить файл и строку, где корутина приостановлена."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Возвращает файл и номер строки, где корутина была приостановлена (или приостановлена в последний раз).

## Возвращаемое значение

`array` — массив из двух элементов:
- `[0]` — имя файла (`string` или `null`)
- `[1]` — номер строки (`int`)

## Примеры

### Пример #1 Базовое использование

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // строка 7
});

suspend(); // даём корутине приостановиться

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Приостановлена в: $file:$line\n"; // /app/script.php:7
```

## См. также

- [Coroutine::getSuspendLocation](/ru/docs/reference/coroutine/get-suspend-location.html) — Место приостановки как строка
- [Coroutine::getSpawnFileAndLine](/ru/docs/reference/coroutine/get-spawn-file-and-line.html) — Файл и строка создания
