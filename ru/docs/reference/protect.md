---
layout: docs
lang: ru
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /ru/docs/reference/protect.html
page_title: "protect()"
description: "protect() — выполнение кода в некансельируемом режиме для защиты критических секций."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Выполняет замыкание в некансельируемом режиме. Отмена корутины откладывается до завершения замыкания.

## Описание

```php
protect(\Closure $closure): mixed
```

На время выполнения `$closure` корутина помечается как защищённая. Если в этот момент поступает запрос на отмену, `CancellationError` будет выброшен только **после** завершения замыкания.

## Параметры

**`closure`**
Замыкание, которое нужно выполнить без прерывания отменой.

## Возвращаемое значение

Возвращает значение, возвращённое замыканием.

## Примеры

### Пример #1 Защита транзакции

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

// Если корутина была отменена во время protect(),
// CancellationError будет выброшен здесь — после commit()
?>
```

### Пример #2 Защита записи в файл

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

### Пример #3 Получение результата

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

### Пример #4 Отложенная отмена и диагностика

Во время `protect()` отмена сохраняется, но не применяется. Это можно проверить через методы корутины:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // Внутри protect() после cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Защищённая операция завершена\n";
    });

    // CancellationError выбрасывается здесь — после protect()
    echo "Этот код не выполнится\n";
});

suspend(); // Даём корутине войти в protect()
$coroutine->cancel();
suspend(); // Даём завершить protect()

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` сразу после `cancel()`, даже внутри `protect()`
- `isCancelled()` — `false` пока `protect()` не завершится, затем `true`

## Примечания

> **Примечание:** Если отмена произошла во время `protect()`, `CancellationError` будет выброшен сразу после возврата из замыкания — результат `protect()` в этом случае потеряется.

> **Примечание:** `protect()` не делает замыкание атомарным — другие корутины могут выполняться во время I/O-операций внутри него. `protect()` гарантирует только то, что **отмена** не прервёт выполнение.

## См. также

- [Отмена](/ru/docs/concepts/cancellation.html) — механизм кооперативной отмены
- [suspend()](/ru/docs/reference/suspend.html) — приостановка корутины
