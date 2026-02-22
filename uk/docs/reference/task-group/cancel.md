---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Скасувати всі задачі в групі."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Скасовує всі запущені корутини та задачі в черзі.
Неявно викликає `seal()`. Задачі в черзі ніколи не запускаються.

Корутини отримують `AsyncCancellation` і завершуються.
Скасування відбувається асинхронно --- використовуйте `awaitCompletion()`, щоб гарантувати завершення.

## Параметри

**cancellation**
: Виняток, який є причиною скасування. Якщо `null`, використовується стандартний `AsyncCancellation` з повідомленням "TaskGroup cancelled".

## Приклади

### Приклад #1 Скасування з очікуванням завершення

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "всі задачі скасовані\n";
});
```

### Приклад #2 Скасування з причиною

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Timeout exceeded"));
    $group->awaitCompletion();
});
```

## Дивіться також

- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) --- Запечатати без скасування
- [TaskGroup::awaitCompletion](/uk/docs/reference/task-group/await-completion.html) --- Дочекатися завершення
- [TaskGroup::dispose](/uk/docs/reference/task-group/dispose.html) --- Вивільнити область видимості групи
