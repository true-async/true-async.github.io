---
layout: docs
lang: uk
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /uk/docs/reference/protect.html
page_title: "protect()"
description: "protect() — виконання коду в режимі без скасування для захисту критичних секцій."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Виконує замикання в режимі без скасування. Скасування корутини відкладається до завершення замикання.

## Опис

```php
protect(\Closure $closure): mixed
```

Поки `$closure` виконується, корутина позначена як захищена. Якщо запит на скасування надійде протягом цього часу, `AsyncCancellation` буде викинуто лише **після** завершення замикання.

## Параметри

**`closure`**
Замикання, яке потрібно виконати без переривання скасуванням.

## Значення, що повертаються

Повертає значення, яке повернуло замикання.

## Приклади

### Приклад #1 Захист транзакції

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// Якщо корутину було скасовано під час protect(),
// AsyncCancellation буде викинуто тут — після commit()
?>
```

### Приклад #2 Захист запису у файл

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### Приклад #3 Отримання результату

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### Приклад #4 Відкладене скасування та діагностика

Під час `protect()` скасування зберігається, але не застосовується. Це можна перевірити через методи корутини:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // Усередині protect() після cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Protected operation completed\n";
    });

    // AsyncCancellation викидається тут — після protect()
    echo "This code will not execute\n";
});

suspend(); // Дозволити корутині увійти в protect()
$coroutine->cancel();
suspend(); // Дозволити protect() завершитися

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` одразу після `cancel()`, навіть усередині `protect()`
- `isCancelled()` — `false` поки `protect()` виконується, потім `true`

## Примітки

> **Примітка:** Якщо скасування відбулося під час `protect()`, `AsyncCancellation` буде викинуто одразу після повернення замикання — значення, що повертається `protect()`, у цьому випадку буде втрачено.

> **Примітка:** `protect()` не робить замикання атомарним — інші корутини можуть виконуватися під час операцій введення-виведення всередині нього. `protect()` лише гарантує, що **скасування** не перерве виконання.

## Дивіться також

- [Cancellation](/uk/docs/components/cancellation.html) — кооперативний механізм скасування
- [suspend()](/uk/docs/reference/suspend.html) — призупинення корутини
