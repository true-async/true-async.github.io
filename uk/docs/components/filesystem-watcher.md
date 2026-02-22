---
layout: docs
lang: uk
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /uk/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher у TrueAsync -- постійний спостерігач за файловою системою з підтримкою foreach-ітерації, буферизацією подій та двома режимами зберігання."
---

# FileSystemWatcher: Моніторинг файлової системи

## Що таке FileSystemWatcher

`Async\FileSystemWatcher` -- це постійний спостерігач за змінами у файлах і директоріях.
На відміну від одноразових підходів, FileSystemWatcher працює безперервно і доставляє події через стандартну `foreach`-ітерацію:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

Ітерація автоматично призупиняє корутину, коли буфер порожній, і відновлює її, коли надходить нова подія.

## FileSystemEvent

Кожна подія -- це об'єкт `Async\FileSystemEvent` з чотирма readonly-властивостями:

| Властивість | Тип       | Опис                                                          |
|-------------|-----------|---------------------------------------------------------------|
| `path`      | `string`  | Шлях, переданий у конструктор `FileSystemWatcher`             |
| `filename`  | `?string` | Ім'я файлу, що викликав подію (може бути `null`)              |
| `renamed`   | `bool`    | `true` -- файл створено, видалено або перейменовано            |
| `changed`   | `bool`    | `true` -- вміст файлу змінено                                 |

## Два режими буферизації

### Coalesce (за замовчуванням)

У режимі coalesce події групуються за ключем `path/filename`. Якщо файл змінювався кілька разів до того, як ітератор обробив подію, у буфері залишається лише одна подія з об'єднаними прапорцями:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- за замовчуванням
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

Це оптимально для типових сценаріїв: hot-reload, перезбірка при зміні конфігурації, синхронізація.

### Raw

У режимі raw кожна подія від ОС зберігається як окремий елемент у циклічному буфері:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Підходить, коли важливий точний порядок та кількість подій -- аудит, логування, реплікація.

## Конструктор

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- шлях до файлу або директорії. Якщо шлях не існує, буде викинуто `Error`.

**`recursive`** -- якщо `true`, вкладені директорії також відстежуються.

**`coalesce`** -- режим буферизації: `true` -- об'єднання подій (HashTable), `false` -- усі події (циклічний буфер).

Моніторинг починається одразу при створенні об'єкта. Події буферизуються ще до початку ітерації.

## Життєвий цикл

### close()

Зупиняє моніторинг. Поточна ітерація завершується після обробки подій, що залишилися в буфері. Ідемпотентний -- повторні виклики безпечні.

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

### Автоматичне закриття

Якщо об'єкт `FileSystemWatcher` знищується (виходить із зони видимості), моніторинг автоматично зупиняється.

## Приклади

### Hot-Reload конфігурації

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Config changed: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Обмежений за часом моніторинг

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

echo "Monitoring finished\n";
?>
```

### Моніторинг кількох директорій

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

### Режим Raw для аудиту

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

## Скасування через Scope

FileSystemWatcher коректно завершує роботу при скасуванні scope:

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
        echo "Iteration finished\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## Дивіться також

- [Корутини](/uk/docs/components/coroutines.html) -- базова одиниця конкурентності
- [Channel](/uk/docs/components/channels.html) -- CSP-канали для передачі даних
- [Скасування](/uk/docs/components/cancellation.html) -- механізм скасування
