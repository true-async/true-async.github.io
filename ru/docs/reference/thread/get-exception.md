---
layout: docs
lang: ru
path_key: "/docs/reference/thread/get-exception.html"
nav_active: docs
permalink: /ru/docs/reference/thread/get-exception.html
page_title: "Thread::getException"
description: "Получить исключение, с которым завершился поток."
---

# Thread::getException

(PHP 8.6+, True Async 1.0)

```php
public Thread::getException(): mixed
```

Возвращает `Async\RemoteException`, если поток завершился с исключением. Возвращает `null`, если поток ещё не завершился, завершился успешно или был отменён.

`RemoteException` является обёрткой над оригинальным исключением из дочернего потока. Используйте методы `getRemoteException()` и `getRemoteClass()` объекта `RemoteException` для получения подробностей об исходной ошибке.

## Возвращаемое значение

`Async\RemoteException|null` — обёртка над исключением потока, либо `null`.

## Примеры

### Пример #1 Различие успешного завершения и ошибки

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new \RuntimeException("Ошибка в потоке");
    });

    await($thread);

    if ($thread->isCompleted()) {
        $exception = $thread->getException();

        if ($exception !== null) {
            echo "Поток завершился с ошибкой: " . $exception->getMessage() . "\n";
            echo "Исходный класс: " . $exception->getRemoteClass() . "\n";
        } else {
            echo "Результат: " . $thread->getResult() . "\n";
        }
    }
});
```

### Пример #2 Обработка RemoteException без await()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new \InvalidArgumentException("Неверный аргумент");
    });

    // Ждём завершения без распространения исключения
    while (!$thread->isCompleted()) {
        suspend();
    }

    $exc = $thread->getException();
    if ($exc instanceof \Async\RemoteException) {
        echo "Класс исходного исключения: " . $exc->getRemoteClass() . "\n";
        echo "Сообщение: " . $exc->getMessage() . "\n";
    }
});
```

## См. также

- [Thread::getResult()](/ru/docs/reference/thread/get-result.html) — Получить результат
- [Thread::isCompleted()](/ru/docs/reference/thread/is-completed.html) — Проверить завершение
- [await()](/ru/docs/reference/await.html) — Дождаться с распространением исключения
- [Async\Thread](/ru/docs/components/threads.html) — Компонент потоков
