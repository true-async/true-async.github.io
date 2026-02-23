---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/join-any.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/join-any.html
page_title: "TaskSet::joinAny"
description: "Получить результат первой успешно завершившейся задачи с автоматическим удалением из набора."
---

# TaskSet::joinAny

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAny(): Async\Future
```

Возвращает `Future`, который разрешится результатом первой *успешно* завершившейся задачи.
Задачи, завершившиеся с ошибкой, пропускаются.

**После доставки результата запись автоматически удаляется из набора.**

Остальные задачи продолжают работать.

Если все задачи завершились с ошибкой — `Future` реджектится с `CompositeException`.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`.

## Возвращаемое значение

`Async\Future` — будущий результат первой успешной задачи.
Для получения значения вызовите `->await()`.

## Ошибки

- Бросает `Async\AsyncException`, если набор пуст.
- `Future` реджектится с `Async\CompositeException`, если все задачи завершились с ошибкой.

## Примеры

### Пример #1 Первый успешный результат

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("fail 1"));
    $set->spawn(fn() => throw new \RuntimeException("fail 2"));
    $set->spawn(fn() => "success!");

    $result = $set->joinAny()->await();
    echo $result . "\n"; // "success!"
    echo $set->count() . "\n"; // 2 (ошибочные задачи остались)
});
```

### Пример #2 Все задачи упали

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("err 1"));
    $set->spawn(fn() => throw new \RuntimeException("err 2"));

    $set->seal();

    try {
        $set->joinAny()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " ошибок\n"; // "2 ошибок"
    }
});
```

### Пример #3 Устойчивый поиск

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => searchGoogle($query));
    $set->spawn(fn() => searchBing($query));
    $set->spawn(fn() => searchDuckDuckGo($query));

    $result = $set->joinAny()->await(Async\timeout(3.0));
    echo "Найдено, активных: {$set->count()}\n";
});
```

## См. также

- [TaskSet::joinNext](/ko/docs/reference/task-set/join-next.html) — Первый завершившийся (успех или ошибка)
- [TaskSet::joinAll](/ko/docs/reference/task-set/join-all.html) — Все результаты
- [TaskGroup::any](/ko/docs/reference/task-group/any.html) — Аналог без автоочистки
