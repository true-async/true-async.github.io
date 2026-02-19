---
layout: docs
lang: ru
path_key: "/docs/reference/watch-filesystem.html"
nav_active: docs
permalink: /ru/docs/reference/watch-filesystem.html
page_title: "watch_filesystem()"
description: "watch_filesystem() — асинхронное отслеживание изменений файловой системы."
---

# watch_filesystem

(PHP 8.6+, True Async 1.0)

`watch_filesystem()` — Отслеживает изменения в файле или директории, возвращая `Future` с информацией о первом обнаруженном событии.

## Описание

```php
watch_filesystem(
    string $path,
    bool $recursive = false,
    ?Completable $cancellation = null
): Async\Future
```

Начинает наблюдение за файлом или директорией. Возвращает `Future`, который резолвится объектом `Async\FileSystemEvent` при первом обнаруженном изменении (one-shot семантика). После срабатывания наблюдение автоматически останавливается.

## Параметры

**`path`**
Путь к файлу или директории для наблюдения.

**`recursive`**
Если `true` — отслеживаются также вложенные директории. По умолчанию `false`.

**`cancellation`**
Объект отмены (например, результат `timeout()`), позволяющий прервать наблюдение. При срабатывании `Future` реджектится с `TimeoutException` или `CancellationException`.

## Возвращаемое значение

Возвращает `Async\Future<Async\FileSystemEvent>`.

Объект `Async\FileSystemEvent` содержит:

| Свойство   | Тип       | Описание                                              |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | Путь, переданный в `watch_filesystem()`               |
| `filename` | `?string` | Имя файла, вызвавшего событие (может быть `null`)     |
| `renamed`  | `bool`    | `true` — файл создан, удалён или переименован         |
| `changed`  | `bool`    | `true` — содержимое файла изменено                    |

Хотя бы одно из свойств `renamed` или `changed` всегда равно `true`.

## Ошибки/Исключения

- `Error` — если путь не существует или недоступен для наблюдения.
- `Async\TimeoutException` — если передан `cancellation` на основе `timeout()` и время истекло.
- `Async\CancellationException` — если наблюдение отменено через cancellation-объект.

## Примеры

### Пример #1 Отслеживание создания файла

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\delay;
use function Async\watch_filesystem;

$future = watch_filesystem('/tmp/mydir');

spawn(function() {
    delay(100);
    file_put_contents('/tmp/mydir/report.txt', 'data');
});

$event = await($future);
echo "Файл: {$event->filename}\n";
echo "Создан: " . ($event->renamed ? 'да' : 'нет') . "\n";
echo "Изменён: " . ($event->changed ? 'да' : 'нет') . "\n";
?>
```

### Пример #2 Отслеживание переименования

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\delay;
use function Async\watch_filesystem;

file_put_contents('/tmp/mydir/old.txt', 'content');

$future = watch_filesystem('/tmp/mydir');

spawn(function() {
    delay(100);
    rename('/tmp/mydir/old.txt', '/tmp/mydir/new.txt');
});

$event = await($future);
var_dump($event->renamed); // true
?>
```

### Пример #3 Отмена по таймауту

```php
<?php
use function Async\await;
use function Async\timeout;
use function Async\watch_filesystem;
use Async\TimeoutException;

$future = watch_filesystem('/tmp/mydir', false, timeout(5000));

try {
    $event = await($future);
    echo "Обнаружено изменение: {$event->filename}\n";
} catch (TimeoutException $e) {
    echo "Изменений не произошло за 5 секунд\n";
}
?>
```

### Пример #4 Рекурсивное наблюдение

```php
<?php
use function Async\await;
use function Async\watch_filesystem;

$future = watch_filesystem('/tmp/project', recursive: true);
$event = await($future);

echo "Изменение в {$event->path}: {$event->filename}\n";
?>
```

### Пример #5 Непрерывное наблюдение в цикле

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\watch_filesystem;

spawn(function() {
    while (true) {
        $event = await(watch_filesystem('/etc/myapp'));
        echo "Конфиг изменён: {$event->filename}\n";
        reloadConfig();
    }
});
?>
```

## Примечания

> **Примечание:** Функция использует one-shot семантику — `Future` резолвится только на первое событие. Для непрерывного наблюдения вызывайте `watch_filesystem()` повторно в цикле.

> **Примечание:** `watch_filesystem()` автоматически запускает планировщик, если он ещё не запущен.

## См. также

- [timeout()](/ru/docs/reference/timeout.html) — создание таймаута для ограничения ожидания
- [await()](/ru/docs/reference/await.html) — ожидание результата Future
- [delay()](/ru/docs/reference/delay.html) — приостановка корутины
