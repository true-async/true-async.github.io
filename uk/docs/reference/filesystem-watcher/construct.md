---
layout: docs
lang: uk
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /uk/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Створити новий FileSystemWatcher та розпочати спостереження за файлами або директорією."
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

Створює спостерігач та негайно починає відстежувати зміни. Події буферизуються з моменту створення, навіть якщо ітерація ще не розпочалася.

## Параметри

**path**
: Шлях до файлу або директорії для спостереження.
  Якщо шлях не існує або недоступний, буде викинуто `Error`.

**recursive**
: Якщо `true`, вкладені директорії також відстежуються.
  За замовчуванням `false`.

**coalesce**
: Режим буферизації подій.
  `true` (за замовчуванням) --- події групуються за ключем `path/filename`.
  Повторні зміни одного файлу об'єднують прапорці `renamed`/`changed` через OR.
  `false` --- кожна подія ОС зберігається як окремий елемент у кільцевому буфері.

## Помилки/Винятки

- `Error` --- шлях не існує або недоступний для спостереження.

## Приклади

### Приклад #1 Спостереження за директорією

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

### Приклад #2 Рекурсивне спостереження в сирому режимі

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## Дивіться також

- [FileSystemWatcher::close](/uk/docs/reference/filesystem-watcher/close.html) --- Зупинити спостереження
- [FileSystemWatcher](/uk/docs/components/filesystem-watcher.html) --- Огляд концепції
