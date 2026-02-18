---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Пометить корутину как высокоприоритетную для планировщика."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Помечает корутину как высокоприоритетную. Планировщик будет отдавать предпочтение таким корутинам при выборе следующей задачи для выполнения.

Метод возвращает тот же объект корутины, что позволяет использовать fluent-интерфейс.

## Возвращаемое значение

`Coroutine` — тот же объект корутины (fluent interface).

## Примеры

### Пример #1 Установка приоритета

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "важная задача";
})->asHiPriority();
```

### Пример #2 Fluent-интерфейс

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## См. также

- [spawn()](/ru/docs/reference/spawn.html) — Создать корутину
