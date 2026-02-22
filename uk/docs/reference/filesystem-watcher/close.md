---
layout: docs
lang: uk
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /uk/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Зупинити спостереження за файловою системою та завершити ітерацію."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Зупиняє спостереження за файловою системою. Ітерація через `foreach` завершується після обробки решти буферизованих подій.

Ідемпотентний --- повторні виклики безпечні.

## Параметри

Без параметрів.

## Приклади

### Приклад #1 Закриття після отримання потрібної події

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Marker file detected\n";
?>
```

### Приклад #2 Закриття з іншої корутини

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/data');

spawn(function() use ($watcher) {
    delay(10_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processEvent($event);
}

echo "Watching ended by timeout\n";
?>
```

## Дивіться також

- [FileSystemWatcher::isClosed](/uk/docs/reference/filesystem-watcher/is-closed.html) --- Перевірити стан
- [FileSystemWatcher::__construct](/uk/docs/reference/filesystem-watcher/construct.html) --- Створити спостерігач
