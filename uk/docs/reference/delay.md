---
layout: docs
lang: uk
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /uk/docs/reference/delay.html
page_title: "delay()"
description: "delay() — призупинення корутини на задану кількість мілісекунд."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Призупиняє виконання поточної корутини на вказану кількість мілісекунд.

## Опис

```php
delay(int $ms): void
```

Призупиняє корутину, передаючи управління планувальнику. Через `$ms` мілісекунд корутина буде відновлена.
Інші корутини продовжують виконуватися під час очікування.

## Параметри

**`ms`**
Час очікування в мілісекундах. Якщо `0`, корутина просто передає управління планувальнику (подібно до `suspend()`, але з постановкою в чергу).

## Значення, що повертаються

Не повертає значення.

## Приклади

### Приклад #1 Базове використання

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // Чекати 1 секунду
    echo "1 second passed\n";
});
?>
```

### Приклад #2 Періодичне виконання

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Checking status...\n";
        delay(5000); // Кожні 5 секунд
    }
});
?>
```

## Примітки

> **Примітка:** `delay()` не блокує весь процес PHP — блокується лише поточна корутина.

> **Примітка:** `delay()` автоматично запускає планувальник, якщо він ще не запущений.

## Дивіться також

- [suspend()](/uk/docs/reference/suspend.html) — передача управління без затримки
- [timeout()](/uk/docs/reference/timeout.html) — створення тайм-ауту для обмеження очікування
