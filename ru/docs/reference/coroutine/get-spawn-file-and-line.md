---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Получить файл и строку, где корутина была создана."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Возвращает файл и номер строки, где был вызван `spawn()` для создания этой корутины.

## Возвращаемое значение

`array` — массив из двух элементов:
- `[0]` — имя файла (`string` или `null`)
- `[1]` — номер строки (`int`)

## Примеры

### Пример #1 Базовое использование

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // строка 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "Файл: $file\n";  // /app/script.php
echo "Строка: $line\n"; // 5
```

## См. также

- [Coroutine::getSpawnLocation](/ru/docs/reference/coroutine/get-spawn-location.html) — Место создания как строка
- [Coroutine::getSuspendFileAndLine](/ru/docs/reference/coroutine/get-suspend-file-and-line.html) — Файл и строка приостановки
