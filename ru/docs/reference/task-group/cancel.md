---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Отменить все задачи в группе."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Отменяет все работающие корутины и задачи в очереди.
Неявно вызывает `seal()`. Задачи из очереди никогда не запускаются.

Корутины получают `AsyncCancellation` и завершаются.
Отмена происходит асинхронно — для гарантии завершения используйте `awaitCompletion()`.

## Параметры

**cancellation**
: Исключение-причина отмены. Если `null` — используется стандартный `AsyncCancellation` с сообщением "TaskGroup cancelled".

## Примеры

### Пример #1 Отмена с ожиданием завершения

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "долгая задача";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "все задачи отменены\n";
});
```

### Пример #2 Отмена с причиной

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Превышен таймаут"));
    $group->awaitCompletion();
});
```

## См. также

- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать без отмены
- [TaskGroup::awaitCompletion](/ru/docs/reference/task-group/await-completion.html) — Дождаться завершения
- [TaskGroup::dispose](/ru/docs/reference/task-group/dispose.html) — Уничтожить scope группы
