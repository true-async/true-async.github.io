---
layout: docs
lang: uk
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /uk/docs/reference/future/await.html
page_title: "Future::await"
description: "Очікування результату Future."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Очікує завершення `Future` та повертає його результат. Блокує поточну корутину до завершення Future. Якщо Future завершився з помилкою, метод викидає відповідний виняток. Можна передати `Completable` для скасування очікування за тайм-аутом або зовнішньою умовою.

## Параметри

`cancellation` — об'єкт скасування очікування. Якщо передано і спрацьовує до завершення Future, буде викинуто `CancelledException`. За замовчуванням `null`.

## Значення, що повертається

`mixed` — результат Future.

## Помилки

Викидає виняток, якщо Future завершився з помилкою або був скасований.

## Приклади

### Приклад #1 Базове очікування результату

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### Приклад #2 Обробка помилок під час очікування

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## Дивіться також

- [Future::isCompleted](/uk/docs/reference/future/is-completed.html) — Перевірити, чи завершено Future
- [Future::cancel](/uk/docs/reference/future/cancel.html) — Скасувати Future
- [Future::map](/uk/docs/reference/future/map.html) — Перетворити результат
