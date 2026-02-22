---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Зареєструвати обробник, який буде викликано після завершення корутини."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Реєструє функцію зворотного виклику, яка буде викликана після завершення корутини, незалежно від результату (успіх, помилка або скасування).

Якщо корутина вже завершилася на момент виклику `finally()`, зворотний виклик буде виконано негайно.

Можна зареєструвати кілька обробників -- вони виконуються в порядку додавання.

## Параметри

**callback**
: Функція-обробник. Отримує об'єкт корутини як аргумент.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### Приклад #2 Очищення ресурсів

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
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### Приклад #3 Кілька обробників

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### Приклад #4 Реєстрація після завершення

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// Корутина вже завершилася -- зворотний виклик виконується негайно
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## Дивіться також

- [Coroutine::isCompleted](/uk/docs/reference/coroutine/is-completed.html) -- Перевірка завершення
- [Coroutine::getResult](/uk/docs/reference/coroutine/get-result.html) -- Отримати результат
