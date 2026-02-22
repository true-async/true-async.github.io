---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Позначити корутину як високопріоритетну для планувальника."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Позначає корутину як високопріоритетну. Планувальник надаватиме перевагу таким корутинам при виборі наступного завдання для виконання.

Метод повертає той самий об'єкт корутини, що дозволяє використовувати ланцюговий інтерфейс.

## Значення, що повертається

`Coroutine` -- той самий об'єкт корутини (ланцюговий інтерфейс).

## Приклади

### Приклад #1 Встановлення пріоритету

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### Приклад #2 Ланцюговий інтерфейс

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) -- Створити корутину
