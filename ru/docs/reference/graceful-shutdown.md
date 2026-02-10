---
layout: docs
lang: ru
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /ru/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — корректное завершение планировщика с отменой всех корутин."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Инициирует корректное завершение планировщика. Все корутины получают запрос на отмену.

## Описание

```php
graceful_shutdown(?Async\CancellationError $cancellationError = null): void
```

Запускает процедуру корректного завершения: все активные корутины отменяются, а приложение продолжает работу до их естественного завершения.

## Параметры

**`cancellationError`**
Опциональная ошибка отмены, которая будет передана корутинам. Если не указана, используется стандартное сообщение.

## Возвращаемое значение

Нет возвращаемого значения.

## Примеры

### Пример #1 Обработка сигнала завершения

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\CancellationError;

// Сервер обрабатывает запросы
spawn(function() {
    // При получении сигнала — корректно завершаемся
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new CancellationError('Server shutdown'));
    });

    while (true) {
        // Обработка запросов...
    }
});
?>
```

## Примечания

> **Примечание:** Корутины, созданные **после** вызова `graceful_shutdown()`, будут немедленно отменены.

> **Примечание:** `exit` и `die` автоматически вызывают graceful shutdown.

## См. также

- [Отмена](/ru/docs/concepts/cancellation.html) — механизм отмены
- [Scope](/ru/docs/concepts/scope.html) — управление жизненным циклом
