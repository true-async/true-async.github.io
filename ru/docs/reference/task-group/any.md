---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Получить результат первой успешной задачи."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): mixed
```

Возвращает результат первой *успешно* завершившейся задачи.
Задачи, завершившиеся с ошибкой, пропускаются.
Остальные задачи **продолжают работать**.

Если все задачи завершились с ошибкой — бросает `CompositeException`.

## Возвращаемое значение

Результат первой успешной задачи.

## Ошибки

- Бросает `Async\AsyncException`, если группа пуста.
- Бросает `Async\CompositeException`, если все задачи завершились с ошибкой.

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

    $result = $group->any();
    echo $result . "\n"; // "success!"
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
        $group->any();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " ошибок\n"; // "2 ошибок"
    }
});
```

## См. также

- [TaskGroup::race](/ru/docs/reference/task-group/race.html) — Первый завершившийся (успех или ошибка)
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Все результаты
