---
layout: docs
lang: ru
path_key: "/docs/reference/thread/is-completed.html"
nav_active: docs
permalink: /ru/docs/reference/thread/is-completed.html
page_title: "Thread::isCompleted"
description: "Проверить, завершил ли поток выполнение."
---

# Thread::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Thread::isCompleted(): bool
```

Возвращает `true`, если поток завершил выполнение — независимо от причины: успешный возврат значения, выброс исключения или отмена. После перехода в состояние `true` оно уже не изменится.

## Возвращаемое значение

`bool` — `true`, если поток завершён; `false`, если ещё выполняется.

## Примеры

### Пример #1 Неблокирующая проверка перед getResult()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        return "результат";
    });

    // Отдаём управление, чтобы поток успел завершиться
    suspend();

    if ($thread->isCompleted()) {
        echo "Результат: " . $thread->getResult() . "\n";
    } else {
        echo "Поток ещё не завершён\n";
    }
});
```

### Пример #2 Ожидание завершения нескольких потоков

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $threads = [
        spawn_thread(fn() => heavyTask(1)),
        spawn_thread(fn() => heavyTask(2)),
        spawn_thread(fn() => heavyTask(3)),
    ];

    // Ждём, пока все завершатся
    do {
        suspend();
        $pending = array_filter($threads, fn($t) => !$t->isCompleted());
    } while (!empty($pending));

    foreach ($threads as $i => $thread) {
        echo "Поток $i: " . $thread->getResult() . "\n";
    }
});
```

## См. также

- [Thread::isRunning()](/ru/docs/reference/thread/is-running.html) — Проверить выполнение
- [Thread::isCancelled()](/ru/docs/reference/thread/is-cancelled.html) — Проверить отмену
- [Thread::getResult()](/ru/docs/reference/thread/get-result.html) — Получить результат
- [Thread::getException()](/ru/docs/reference/thread/get-exception.html) — Получить исключение
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
