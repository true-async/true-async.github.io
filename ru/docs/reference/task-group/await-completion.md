---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Дождаться завершения всех задач без исключений."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Ждёт, пока все задачи в группе полностью завершатся.
В отличие от `all()`, не возвращает результаты и не бросает исключений при ошибках задач.

Группа должна быть запечатана перед вызовом.

Типичный сценарий — дождаться реального завершения корутин после `cancel()`.
Метод `cancel()` инициирует отмену, но корутины могут завершаться асинхронно.
`awaitCompletion()` гарантирует, что все корутины остановлены.

## Ошибки

Бросает `Async\AsyncException`, если группа не запечатана.

## Примеры

### Пример #1 Ожидание после cancel

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "все корутины завершены\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Пример #2 Получение результатов после ожидания

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // Без исключений — проверяем вручную
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Успешных: " . count($results) . "\n"; // 1
    echo "Ошибок: " . count($errors) . "\n";    // 1
});
```

## См. также

- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач и получить результаты
- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить все задачи
- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать группу
