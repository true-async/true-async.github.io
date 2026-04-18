---
layout: docs
lang: ru
path_key: "/docs/reference/thread/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/thread/cancel.html
page_title: "Thread::cancel"
description: "Запросить отмену выполнения потока."
---

# Thread::cancel

(PHP 8.6+, True Async 1.0)

```php
public Thread::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Запрашивает отмену потока. Отмена работает **кооперативно** — поток не прерывается мгновенно. Он должен самостоятельно реагировать на запрос отмены: например, через точки приостановки корутин внутри потока или явную проверку состояния.

После того как поток фактически остановится, `isCancelled()` вернёт `true`.

## Параметры

**cancellation**
: Объект-причина отмены. Если `null` — создаётся стандартный `AsyncCancellation`.

## Примеры

### Пример #1 Отмена долго выполняющегося потока

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        // Поток выполняет длительную работу
        for ($i = 0; $i < 100; $i++) {
            sleep(1);
            // Здесь поток мог бы проверять флаг отмены
        }
        return "готово";
    });

    // Отменяем через некоторое время
    \Async\delay(2);
    $thread->cancel();

    await($thread);

    echo $thread->isCancelled()
        ? "Поток успешно отменён\n"
        : "Поток завершился до отмены\n";
});
```

### Пример #2 Отмена с указанием причины

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(60);
    });

    $thread->cancel(new \Async\AsyncCancellation("Превышен таймаут операции"));

    await($thread);

    if ($thread->isCancelled()) {
        echo "Поток отменён\n";
    }
});
```

### Пример #3 Отмена нескольких потоков

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $threads = array_map(
        fn($i) => spawn_thread(fn() => sleep(30)),
        range(1, 5)
    );

    // Отменяем все сразу
    foreach ($threads as $thread) {
        $thread->cancel();
    }

    foreach ($threads as $i => $thread) {
        await($thread);
        echo "Поток $i отменён: " . ($thread->isCancelled() ? 'да' : 'нет') . "\n";
    }
});
```

## См. также

- [Thread::isCancelled()](/ru/docs/reference/thread/is-cancelled.html) — Проверить отмену
- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
