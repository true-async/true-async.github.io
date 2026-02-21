---
layout: docs
lang: ru
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /ru/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher в TrueAsync — персистентный наблюдатель за файловой системой с поддержкой foreach-итерации, буферизацией событий и двумя режимами хранения."
---

# FileSystemWatcher: наблюдение за файловой системой

## Что такое FileSystemWatcher

`Async\FileSystemWatcher` — персистентный наблюдатель за изменениями в файлах и директориях.
В отличие от one-shot подходов, FileSystemWatcher работает непрерывно и доставляет события через стандартную `foreach`-итерацию:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

Итерация автоматически приостанавливает корутину, когда буфер пуст, и возобновляет при поступлении нового события.

## FileSystemEvent

Каждое событие — объект `Async\FileSystemEvent` с четырьмя readonly-свойствами:

| Свойство   | Тип       | Описание                                              |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | Путь, переданный в конструктор `FileSystemWatcher`    |
| `filename` | `?string` | Имя файла, вызвавшего событие (может быть `null`)     |
| `renamed`  | `bool`    | `true` — файл создан, удалён или переименован         |
| `changed`  | `bool`    | `true` — содержимое файла изменено                    |

## Два режима буферизации

### Coalesce (по умолчанию)

В режиме coalesce события группируются по ключу `path/filename`. Если файл изменился несколько раз до того, как итератор его обработал — в буфере останется одно событие с объединёнными флагами:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true — по умолчанию
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

Это оптимально для типичных сценариев: hot-reload, пересборка при изменении конфигов, синхронизация.

### Raw

В raw-режиме каждое событие от ОС сохраняется как отдельный элемент в циклическом буфере:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Подходит когда важен точный порядок и количество событий — аудит, логирование, репликация.

## Конструктор

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** — путь к файлу или директории. Если путь не существует — выбрасывается `Error`.

**`recursive`** — если `true`, отслеживаются также вложенные директории.

**`coalesce`** — режим буферизации: `true` — объединение событий (HashTable), `false` — все события (circular buffer).

Наблюдение начинается сразу при создании объекта. События буферизуются даже до начала итерации.

## Жизненный цикл

### close()

Останавливает наблюдение. Текущая итерация завершается после обработки оставшихся событий в буфере. Идемпотентен — повторный вызов безопасен.

```php
<?php
$watcher->close();
?>
```

### isClosed()

```php
<?php
$watcher->isClosed(); // bool
?>
```

### Автоматическое закрытие

Если объект `FileSystemWatcher` уничтожается (выходит из scope), наблюдение автоматически останавливается.

## Примеры

### Hot-reload конфигурации

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Конфиг изменён: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Ограничение по времени

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/uploads');

spawn(function() use ($watcher) {
    delay(30_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processUpload($event->filename);
}

echo "Наблюдение завершено\n";
?>
```

### Обработка нескольких директорий

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

$dirs = ['/var/log/app', '/var/log/nginx', '/var/log/postgres'];

foreach ($dirs as $dir) {
    spawn(function() use ($dir) {
        $watcher = new FileSystemWatcher($dir);

        foreach ($watcher as $event) {
            echo "[{$dir}] {$event->filename}\n";
        }
    });
}
?>
```

### Raw-режим для аудита

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/secure/data', coalesce: false);

    foreach ($watcher as $event) {
        $type = $event->renamed ? 'RENAME' : 'CHANGE';
        auditLog("[{$type}] {$event->path}/{$event->filename}");
    }
});
?>
```

## Отмена через scope

FileSystemWatcher корректно завершается при отмене scope:

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/test');

    spawn(function() use ($watcher) {
        foreach ($watcher as $event) {
            echo "{$event->filename}\n";
        }
        echo "Итерация завершена\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## См. также

- [Корутины](/ru/docs/components/coroutines.html) — базовая единица конкурентности
- [Channel](/ru/docs/components/channels.html) — CSP-каналы для передачи данных
- [Отмена](/ru/docs/components/cancellation.html) — механизм отмены операций
