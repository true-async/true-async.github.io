---
layout: docs
lang: ru
path_key: "/docs/reference/thread/finally.html"
nav_active: docs
permalink: /ru/docs/reference/thread/finally.html
page_title: "Thread::finally"
description: "Зарегистрировать callback на завершение потока."
---

# Thread::finally

(PHP 8.6+, True Async 1.0)

```php
public Thread::finally(\Closure $callback): void
```

Регистрирует функцию обратного вызова, которая будет выполнена при завершении потока — независимо от того, завершился ли он успешно, с исключением или был отменён.

Callback выполняется в **планировщике корутин родительского потока**. Допускается регистрация нескольких callback-ов; они вызываются в порядке регистрации. Callback не принимает аргументов — для получения результата или исключения используйте `getResult()` / `getException()` внутри него.

## Параметры

**callback**
: Функция без параметров, вызываемая при завершении потока.

## Примеры

### Пример #1 Освобождение ресурса после завершения потока

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;

spawn(function() {
    $resource = acquireResource();

    $thread = spawn_thread(function() use ($resource) {
        // работа с ресурсом в потоке
        return processData($resource);
    });

    $thread->finally(function() use ($resource, $thread) {
        releaseResource($resource);
        echo "Ресурс освобождён. Поток отменён: "
            . ($thread->isCancelled() ? 'да' : 'нет') . "\n";
    });
});
```

### Пример #2 Логирование результата потока

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return array_sum(range(1, 100));
    });

    $thread->finally(function() use ($thread) {
        if ($thread->isCancelled()) {
            echo "[лог] Поток отменён\n";
        } elseif ($thread->getException() !== null) {
            echo "[лог] Поток завершился с ошибкой: "
                . $thread->getException()->getMessage() . "\n";
        } else {
            echo "[лог] Поток завершился. Результат: "
                . $thread->getResult() . "\n";
        }
    });

    await($thread);
});
```

### Пример #3 Несколько callback-ов

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(fn() => "результат");

    $thread->finally(function() { echo "Первый callback\n"; });
    $thread->finally(function() { echo "Второй callback\n"; });
    $thread->finally(function() { echo "Третий callback\n"; });

    await($thread);
    // Вывод:
    // Первый callback
    // Второй callback
    // Третий callback
});
```

## См. также

- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [Thread::getResult()](/ru/docs/reference/thread/get-result.html) — Получить результат
- [Thread::getException()](/ru/docs/reference/thread/get-exception.html) — Получить исключение
- [Thread::isCancelled()](/ru/docs/reference/thread/is-cancelled.html) — Проверить отмену
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
