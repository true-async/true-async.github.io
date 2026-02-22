---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Дочекатися завершення всіх задач без генерації винятків."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Очікує повного завершення всіх задач у групі.
На відміну від `all()`, не повертає результати і не генерує винятки при помилках задач.

Група повинна бути запечатана перед викликом цього методу.

Типовий випадок використання --- очікування фактичного завершення корутин після `cancel()`.
Метод `cancel()` ініціює скасування, але корутини можуть завершитися асинхронно.
`awaitCompletion()` гарантує, що всі корутини зупинені.

## Помилки

Кидає `Async\AsyncException`, якщо група не запечатана.

## Приклади

### Приклад #1 Очікування після скасування

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

    echo "всі корутини завершені\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Приклад #2 Отримання результатів після очікування

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // Без винятків — перевіряємо вручну
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Успішних: " . count($results) . "\n"; // 1
    echo "Помилок: " . count($errors) . "\n";   // 1
});
```

## Дивіться також

- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач та отримати результати
- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) --- Скасувати всі задачі
- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) --- Запечатати групу
