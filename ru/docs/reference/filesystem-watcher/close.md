---
layout: docs
lang: ru
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /ru/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Остановить наблюдение за файловой системой и завершить итерацию."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Останавливает наблюдение за файловой системой. Итерация через `foreach` завершается после обработки оставшихся буферизованных событий.

Идемпотентен — повторный вызов безопасен.

## Параметры

Нет параметров.

## Примеры

### Пример #1 Закрытие после получения нужного события

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Файл-маркер обнаружен\n";
?>
```

### Пример #2 Закрытие из другой корутины

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

echo "Наблюдение завершено по таймауту\n";
?>
```

## См. также

- [FileSystemWatcher::isClosed](/ru/docs/reference/filesystem-watcher/is-closed.html) — Проверить состояние
- [FileSystemWatcher::__construct](/ru/docs/reference/filesystem-watcher/construct.html) — Создать наблюдатель
