---
layout: docs
lang: ru
path_key: "/docs/reference/thread/is-cancelled.html"
nav_active: docs
permalink: /ru/docs/reference/thread/is-cancelled.html
page_title: "Thread::isCancelled"
description: "Проверить, был ли поток отменён."
---

# Thread::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Thread::isCancelled(): bool
```

Возвращает `true`, если поток был отменён через `cancel()` и фактически завершил выполнение. Отменённый поток также считается завершённым: `isCancelled() === true` подразумевает `isCompleted() === true`.

## Возвращаемое значение

`bool` — `true`, если поток был отменён; `false` в противном случае.

## Примеры

### Пример #1 Различие между отменой и нормальным завершением

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(10);
        return "никогда не вернётся";
    });

    $thread->cancel();
    await($thread);

    if ($thread->isCancelled()) {
        echo "Поток был отменён\n";
    } elseif ($thread->getException() !== null) {
        echo "Поток завершился с ошибкой\n";
    } else {
        echo "Поток завершился успешно: " . $thread->getResult() . "\n";
    }
});
```

### Пример #2 Проверка отмены при опросе состояния

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(5);
    });

    // Отменяем после первого цикла
    $thread->cancel();

    while (!$thread->isCompleted()) {
        suspend();
    }

    echo $thread->isCancelled()
        ? "Поток остановлен по запросу отмены\n"
        : "Поток завершился самостоятельно\n";
});
```

## См. также

- [Thread::cancel()](/ru/docs/reference/thread/cancel.html) — Запросить отмену
- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
