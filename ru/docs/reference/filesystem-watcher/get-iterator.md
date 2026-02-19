---
layout: docs
lang: ru
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /ru/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Получить асинхронный итератор для foreach-обхода событий файловой системы."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Возвращает итератор для использования в `foreach`. Вызывается автоматически при `foreach ($watcher as $event)`.

Итератор выдаёт объекты `Async\FileSystemEvent`. Когда буфер пуст — корутина приостанавливается до поступления нового события. Итерация завершается, когда наблюдатель закрыт и буфер опустошён.

## Параметры

Нет параметров.

## Возвращаемое значение

`Iterator` — итератор, выдающий объекты `Async\FileSystemEvent`.

## Ошибки/Исключения

- `Error` — если итератор используется вне корутины.

## Примеры

### Пример #1 Стандартное использование через foreach

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
        echo "Событие: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Итерация завершена\n";
});
?>
```

### Пример #2 Прерывание через break

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

## См. также

- [FileSystemWatcher](/ru/docs/concepts/filesystem-watcher.html) — Обзор концепции
- [FileSystemWatcher::close](/ru/docs/reference/filesystem-watcher/close.html) — Остановить наблюдение
