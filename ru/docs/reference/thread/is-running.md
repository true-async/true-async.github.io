---
layout: docs
lang: ru
path_key: "/docs/reference/thread/is-running.html"
nav_active: docs
permalink: /ru/docs/reference/thread/is-running.html
page_title: "Thread::isRunning"
description: "Проверить, выполняется ли поток в данный момент."
---

# Thread::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Thread::isRunning(): bool
```

Возвращает `true`, если поток был запущен и ещё не завершил выполнение. Возвращает `false`, если поток уже завершён — успешно, с исключением или отменён.

## Возвращаемое значение

`bool` — `true`, если поток выполняется; `false`, если завершён.

## Примеры

### Пример #1 Проверка состояния во время ожидания

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        // имитация длительной работы
        sleep(1);
        return "готово";
    });

    var_dump($thread->isRunning()); // bool(true)

    await($thread);

    var_dump($thread->isRunning()); // bool(false)
});
```

### Пример #2 Опрос состояния в цикле

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(2);
        return 42;
    });

    while ($thread->isRunning()) {
        echo "Поток ещё работает...\n";
        suspend(); // отдаём управление планировщику
    }

    echo "Поток завершён. Результат: " . $thread->getResult() . "\n";
});
```

## См. также

- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [Thread::isCancelled()](/ru/docs/reference/thread/is-cancelled.html) — Проверить отмену
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
