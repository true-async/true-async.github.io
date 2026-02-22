---
layout: docs
lang: uk
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /uk/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — плавне завершення планувальника зі скасуванням усіх корутин."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Ініціює плавне завершення роботи планувальника. Усі корутини отримують запит на скасування.

## Опис

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Запускає процедуру плавного завершення: усі активні корутини скасовуються, а застосунок продовжує працювати, поки вони не завершаться природним шляхом.

## Параметри

**`cancellationError`**
Необов'язкова помилка скасування, що передається корутинам. Якщо не вказано, використовується повідомлення за замовчуванням.

## Значення, що повертаються

Не повертає значення.

## Приклади

### Приклад #1 Обробка сигналу завершення

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Сервер, що обробляє запити
spawn(function() {
    // При отриманні сигналу — плавно завершити роботу
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server shutdown'));
    });

    while (true) {
        // Обробка запитів...
    }
});
?>
```

## Примітки

> **Примітка:** Корутини, створені **після** виклику `graceful_shutdown()`, будуть негайно скасовані.

> **Примітка:** `exit` та `die` автоматично запускають плавне завершення.

## Дивіться також

- [Cancellation](/uk/docs/components/cancellation.html) — механізм скасування
- [Scope](/uk/docs/components/scope.html) — управління життєвим циклом
