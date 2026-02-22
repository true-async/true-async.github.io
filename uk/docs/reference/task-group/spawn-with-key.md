---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Додати задачу до групи з явним ключем."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Додає callable до групи з вказаним ключем.
Результат задачі буде доступний за цим ключем в `all()`, `getResults()` та під час ітерації.

## Параметри

**key**
: Ключ задачі. Рядок або ціле число. Дублікати не допускаються.

**task**
: Callable для виконання.

**args**
: Аргументи, що передаються до callable.

## Помилки

Кидає `Async\AsyncException`, якщо група запечатана або ключ вже існує.

## Приклади

### Приклад #1 Іменовані задачі

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## Дивіться також

- [TaskGroup::spawn](/uk/docs/reference/task-group/spawn.html) --- Додати задачу з автоматично збільшуваним ключем
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
