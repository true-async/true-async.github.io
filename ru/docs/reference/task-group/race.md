---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Получить результат первой завершившейся задачи."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): mixed
```

Возвращает результат первой завершившейся задачи — успешной или с ошибкой.
Если задача завершилась с ошибкой, исключение пробрасывается.
Остальные задачи **продолжают работать**.

Если уже есть завершённая задача — возвращает её результат немедленно.

## Возвращаемое значение

Результат первой завершившейся задачи.

## Ошибки

- Бросает `Async\AsyncException`, если группа пуста.
- Пробрасывает исключение задачи, если первая завершившаяся задача упала с ошибкой.

## Примеры

### Пример #1 Первый ответ

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race();
    echo $winner . "\n"; // "fast"
});
```

## См. также

- [TaskGroup::any](/ru/docs/reference/task-group/any.html) — Первый успешный результат
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Все результаты
