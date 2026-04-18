---
layout: docs
lang: ru
path_key: "/docs/reference/thread/get-result.html"
nav_active: docs
permalink: /ru/docs/reference/thread/get-result.html
page_title: "Thread::getResult"
description: "Получить результат выполнения потока."
---

# Thread::getResult

(PHP 8.6+, True Async 1.0)

```php
public Thread::getResult(): mixed
```

Возвращает значение, которое вернула функция потока, если поток завершился успешно. Возвращает `null`, если поток ещё не завершился, завершился с исключением или был отменён.

**Важно:** метод не бросает исключений и не ожидает завершения потока. Для блокирующего ожидания с распространением исключений используйте `await()`. Для получения ошибки используйте `getException()`.

## Возвращаемое значение

`mixed` — результат выполнения функции потока, либо `null`.

## Примеры

### Пример #1 Получение результата после isCompleted()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return array_sum(range(1, 1000));
    });

    // Ждём завершения
    await($thread);

    if ($thread->isCompleted() && $thread->getException() === null) {
        echo "Результат: " . $thread->getResult() . "\n"; // 500500
    }
});
```

### Пример #2 Сравнение с await()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return "данные";
    });

    // Вариант 1: await() — ждёт и бросает исключение при ошибке
    try {
        $result = await($thread);
        echo "await: $result\n";
    } catch (\Throwable $e) {
        echo "Ошибка: " . $e->getMessage() . "\n";
    }

    // Вариант 2: getResult() — не ждёт, не бросает
    $thread2 = spawn_thread(fn() => "другие данные");
    await($thread2);
    echo "getResult: " . $thread2->getResult() . "\n";
});
```

## См. также

- [Thread::getException()](/ru/docs/reference/thread/get-exception.html) — Получить исключение
- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [await()](/ru/docs/reference/await.html) — Дождаться результата с исключениями
- [spawn_thread()](/ru/docs/reference/spawn-thread.html) — Запустить поток
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
