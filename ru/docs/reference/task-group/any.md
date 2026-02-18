---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Создать Future, который разрешится результатом первой успешной задачи."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Возвращает `Future`, который разрешится результатом первой *успешно* завершившейся задачи.
Задачи, завершившиеся с ошибкой, пропускаются.
Остальные задачи **продолжают работать**.

Если все задачи завершились с ошибкой — `Future` реджектится с `CompositeException`.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`.

## Возвращаемое значение

`Async\Future` — будущий результат первой успешной задачи.
Для получения значения вызовите `->await()`.

## Ошибки

- Бросает `Async\AsyncException`, если группа пуста.
- `Future` реджектится с `Async\CompositeException`, если все задачи завершились с ошибкой.

## Примеры

### Пример #1 Первый успешный

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // Ошибки упавших задач нужно явно подавить
    $group->suppressErrors();
});
```

### Пример #2 Все упали

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " ошибок\n"; // "2 ошибок"
    }
});
```

### Пример #3 Устойчивый поиск с таймаутом

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Ни один провайдер не ответил за 3 секунды\n";
    }

    $group->suppressErrors();
});
```

## См. также

- [TaskGroup::race](/ru/docs/reference/task-group/race.html) — Первый завершившийся (успех или ошибка)
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Все результаты
