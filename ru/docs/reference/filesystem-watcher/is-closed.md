---
layout: docs
lang: ru
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Проверить, остановлено ли наблюдение за файловой системой."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Возвращает `true`, если наблюдение остановлено — вызван `close()`, scope отменён или произошла ошибка.

## Параметры

Нет параметров.

## Возвращаемое значение

`true` — наблюдатель закрыт, `false` — активен.

## Примеры

### Пример #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## См. также

- [FileSystemWatcher::close](/ru/docs/reference/filesystem-watcher/close.html) — Остановить наблюдение
