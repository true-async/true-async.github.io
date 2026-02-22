---
layout: docs
lang: uk
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /uk/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Отримати асинхронний ітератор для обходу подій файлової системи через foreach."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Повертає ітератор для використання з `foreach`. Викликається автоматично при використанні `foreach ($watcher as $event)`.

Ітератор генерує об'єкти `Async\FileSystemEvent`. Коли буфер порожній, корутина призупиняється до надходження нової події. Ітерація завершується, коли спостерігач закритий і буфер вичерпано.

## Параметри

Без параметрів.

## Значення, що повертається

`Iterator` --- ітератор, що генерує об'єкти `Async\FileSystemEvent`.

## Помилки/Винятки

- `Error` --- якщо ітератор використовується поза корутиною.

## Приклади

### Приклад #1 Стандартне використання з foreach

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/dir');

    spawn(function() use ($watcher) {
        delay(5000);
        $watcher->close();
    });

    foreach ($watcher as $event) {
        echo "Event: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Iteration completed\n";
});
?>
```

### Приклад #2 Переривання за допомогою break

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

foreach ($watcher as $event) {
    if ($event->filename === 'stop.flag') {
        break;
    }
    processEvent($event);
}

$watcher->close();
?>
```

## Дивіться також

- [FileSystemWatcher](/uk/docs/components/filesystem-watcher.html) --- Огляд концепції
- [FileSystemWatcher::close](/uk/docs/reference/filesystem-watcher/close.html) --- Зупинити спостереження
