---
layout: docs
lang: uk
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /uk/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — очікування завершення всіх задач; викидає виняток при першій помилці."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Очікує успішного завершення **всіх** задач. При першій помилці викидає виняток і скасовує решту задач.

## Опис

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Параметри

**`triggers`**
Ітерована колекція об'єктів `Async\Completable` (корутини, Future тощо).

**`cancellation`**
Необов'язковий Awaitable для скасування всього очікування (наприклад, `timeout()`).

**`preserveKeyOrder`**
Якщо `true` (за замовчуванням), результати повертаються у порядку ключів вхідного масиву. Якщо `false` — у порядку завершення.

## Значення, що повертаються

Масив результатів усіх задач. Ключі відповідають ключам вхідного масиву.

## Помилки/Винятки

Викидає виняток першої задачі, що завершилася з помилкою.

## Приклади

### Приклад #1 Паралельне завантаження даних

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

### Приклад #2 З тайм-аутом

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Не всі задачі завершилися протягом 5 секунд\n";
}
?>
```

### Приклад #3 З Iterator замість масиву

Усі функції сімейства `await_*` приймають не лише масиви, а й будь-який `iterable`, включаючи реалізації `Iterator`. Це дозволяє генерувати корутини динамічно:

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

## Дивіться також

- [await_all()](/uk/docs/reference/await-all.html) — усі задачі з толерантністю до помилок
- [await()](/uk/docs/reference/await.html) — очікування однієї задачі
