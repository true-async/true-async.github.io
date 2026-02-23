---
layout: docs
lang: it
path_key: "/docs/reference/task-set/join-next.html"
nav_active: docs
permalink: /it/docs/reference/task-set/join-next.html
page_title: "TaskSet::joinNext"
description: "Получить результат первой завершившейся задачи с автоматическим удалением из набора."
---

# TaskSet::joinNext

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinNext(): Async\Future
```

Возвращает `Future`, который разрешится результатом первой завершившейся задачи — успешной или с ошибкой.
Если задача завершилась с ошибкой, `Future` реджектится с этим исключением.

**После доставки результата запись автоматически удаляется из набора**, и `count()` уменьшается на 1.

Остальные задачи продолжают работать.

Если уже есть завершённая задача — `Future` разрешается немедленно.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`.

## Возвращаемое значение

`Async\Future` — будущий результат первой завершившейся задачи.
Для получения значения вызовите `->await()`.

## Ошибки

- Бросает `Async\AsyncException`, если набор пуст.
- `Future` реджектится с исключением задачи, если первая завершившаяся задача упала с ошибкой.

## Примеры

### Пример #1 Последовательная обработка результатов

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => fetchUser(1));
    $set->spawn(fn() => fetchUser(2));
    $set->spawn(fn() => fetchUser(3));

    echo "до: count=" . $set->count() . "\n"; // 3

    $first = $set->joinNext()->await();
    echo "после первого: count=" . $set->count() . "\n"; // 2

    $second = $set->joinNext()->await();
    echo "после второго: count=" . $set->count() . "\n"; // 1
});
```

### Пример #2 Цикл обработки

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    foreach ($urls as $url) {
        $set->spawn(fn() => httpClient()->get($url)->getBody());
    }
    $set->seal();

    while ($set->count() > 0) {
        try {
            $body = $set->joinNext()->await();
            processResponse($body);
        } catch (\Throwable $e) {
            log("Ошибка: {$e->getMessage()}");
        }
    }
});
```

### Пример #3 С таймаутом

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());

    try {
        $result = $set->joinNext()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "Ни одна задача не завершилась за 5 секунд\n";
    }
});
```

## См. также

- [TaskSet::joinAny](/it/docs/reference/task-set/join-any.html) — Первый успешный результат
- [TaskSet::joinAll](/it/docs/reference/task-set/join-all.html) — Все результаты
- [TaskGroup::race](/it/docs/reference/task-group/race.html) — Аналог без автоочистки
