---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/await-completion.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/await-completion.html
page_title: "TaskSet::awaitCompletion"
description: "Дождаться завершения всех задач в наборе."
---

# TaskSet::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::awaitCompletion(): void
```

Приостанавливает текущую корутину до завершения всех задач в наборе.

Набор **должен** быть запечатан перед вызовом этого метода.

В отличие от `joinAll()`, этот метод не бросает исключений при ошибках задач
и не возвращает результаты.

## Ошибки

Бросает `Async\AsyncException`, если набор не запечатан.

## Примеры

### Пример #1 Ожидание завершения

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => processFile("a.txt"));
    $set->spawn(fn() => processFile("b.txt"));
    $set->spawn(fn() => throw new \RuntimeException("ошибка"));

    $set->seal();
    $set->awaitCompletion(); // Не бросает исключение, даже если задачи упали

    echo "Все задачи завершены\n";
});
```

## См. также

- [TaskSet::joinAll](/ko/docs/reference/task-set/join-all.html) — Дождаться и получить результаты
- [TaskSet::finally](/ko/docs/reference/task-set/finally.html) — Обработчик завершения
