---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Зарегистрировать обработчик, вызываемый при завершении корутины."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Регистрирует callback-функцию, которая будет вызвана при завершении корутины, независимо от результата (успех, ошибка или отмена).

Если корутина уже завершилась на момент вызова `finally()`, callback выполнится немедленно.

Можно зарегистрировать несколько обработчиков — они выполняются в порядке добавления.

## Параметры

**callback**
: Функция-обработчик. Получает объект корутины в качестве аргумента.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Корутина завершилась\n";
});

await($coroutine);
```

### Пример #2 Очистка ресурсов

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Соединение закрыто\n";
});

$result = await($coroutine);
```

### Пример #3 Несколько обработчиков

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Обработчик 1\n");
$coroutine->finally(fn() => echo "Обработчик 2\n");
$coroutine->finally(fn() => echo "Обработчик 3\n");

await($coroutine);
// Вывод:
// Обработчик 1
// Обработчик 2
// Обработчик 3
```

### Пример #4 Регистрация после завершения

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// Корутина уже завершена — callback выполнится немедленно
$coroutine->finally(function() {
    echo "Вызвано немедленно\n";
});
```

## См. также

- [Coroutine::isCompleted](/ru/docs/reference/coroutine/is-completed.html) — Проверить завершение
- [Coroutine::getResult](/ru/docs/reference/coroutine/get-result.html) — Получить результат
