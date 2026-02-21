---
layout: docs
lang: ru
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /ru/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Создание нового FileSystemWatcher и запуск наблюдения за файлами или директорией."
---

# FileSystemWatcher::__construct

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::__construct(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

Создаёт наблюдатель и немедленно начинает отслеживание изменений. События буферизуются с момента создания, даже если итерация ещё не началась.

## Параметры

**path**
: Путь к файлу или директории для наблюдения.
  Если путь не существует или недоступен — выбрасывается `Error`.

**recursive**
: Если `true` — отслеживаются также вложенные директории.
  По умолчанию `false`.

**coalesce**
: Режим буферизации событий.
  `true` (по умолчанию) — события группируются по ключу `path/filename`.
  Повторные изменения одного файла объединяют флаги `renamed`/`changed` через OR.
  `false` — каждое событие от ОС сохраняется как отдельный элемент в циклическом буфере.

## Ошибки/Исключения

- `Error` — путь не существует или недоступен для наблюдения.

## Примеры

### Пример #1 Наблюдение за директорией

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/mydir');

foreach ($watcher as $event) {
    echo "{$event->filename}\n";
    $watcher->close();
}
?>
```

### Пример #2 Рекурсивное наблюдение в raw-режиме

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## См. также

- [FileSystemWatcher::close](/ru/docs/reference/filesystem-watcher/close.html) — Остановить наблюдение
- [FileSystemWatcher](/ru/docs/components/filesystem-watcher.html) — Обзор концепции
