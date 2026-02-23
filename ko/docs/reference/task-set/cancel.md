---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/cancel.html
page_title: "TaskSet::cancel"
description: "Отменить все задачи в наборе."
---

# TaskSet::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Отменяет все работающие корутины и сбрасывает очередь задач.
Неявно вызывает `seal()`.

## Параметры

**cancellation**
: Причина отмены. Если `null`, создаётся стандартный `AsyncCancellation`.

## Примеры

### Пример #1 Отмена по условию

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask1());
    $set->spawn(fn() => longRunningTask2());

    // Отменяем все задачи
    $set->cancel();

    echo $set->isSealed() ? "запечатан\n" : "нет\n"; // "запечатан"
});
```

## См. также

- [TaskSet::seal](/ko/docs/reference/task-set/seal.html) — Запечатать набор
- [TaskSet::dispose](/ko/docs/reference/task-set/dispose.html) — Уничтожить scope набора
