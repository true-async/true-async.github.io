---
layout: docs
lang: uk
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Перевірити, чи було зупинено спостереження за файловою системою."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Повертає `true`, якщо спостереження було зупинено --- було викликано `close()`, область видимості була скасована або сталася помилка.

## Параметри

Без параметрів.

## Значення, що повертається

`true` --- спостерігач закритий, `false` --- активний.

## Приклади

### Приклад #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## Дивіться також

- [FileSystemWatcher::close](/uk/docs/reference/filesystem-watcher/close.html) --- Зупинити спостереження
