---
layout: docs
lang: ru
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /ru/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — ожидание завершения всех задач; при первой ошибке выбрасывает исключение."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Ожидает успешного завершения **всех** задач. При первой ошибке выбрасывает исключение, а остальные задачи отменяются.

## Описание

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Параметры

**`triggers`**
Iterable коллекция объектов `Async\Completable` (корутины, Future и т.д.).

**`cancellation`**
Опциональный Awaitable для отмены всего ожидания (например, `timeout()`).

**`preserveKeyOrder`**
Если `true` (по умолчанию), результаты возвращаются в порядке ключей входного массива. Если `false` — в порядке завершения.

## Возвращаемое значение

Массив результатов всех задач. Ключи соответствуют ключам входного массива.

## Ошибки/Исключения

Выбрасывает исключение из первой задачи, завершившейся с ошибкой.

## Примеры

### Пример #1 Параллельная загрузка данных

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Пример #2 С таймаутом

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Не все задачи завершились за 5 секунд\n";
}
?>
```

### Пример #3 С Iterator вместо массива

Все функции семейства `await_*` принимают не только массивы, но и любые `iterable`, включая реализации `Iterator`. Это позволяет генерировать корутины динамически:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## См. также

- [await_all()](/ru/docs/reference/await-all.html) — все задачи с допуском ошибок
- [await()](/ru/docs/reference/await.html) — ожидание одной задачи
