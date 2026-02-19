---
layout: docs
lang: ru
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /ru/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Помечает scope как не безопасный — корутины получают отмену вместо превращения в zombie."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Помечает scope как "не безопасный". При вызове `disposeSafely()` на таком scope корутины **не** становятся zombie, а получают сигнал отмены. Это полезно для фоновых задач, которые не нуждаются в гарантированном завершении.

Метод возвращает тот же объект scope, что позволяет использовать цепочку вызовов (fluent interface).

## Возвращаемое значение

`Scope` — тот же объект scope (для цепочки вызовов).

## Примеры

### Пример #1 Scope для фоновых задач

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Фоновая задача: очистка кеша
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// При disposeSafely() корутины получат отмену, а не станут zombie
$scope->disposeSafely();
```

### Пример #2 Использование с inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Фоновый процесс\n";
    \Async\delay(10_000);
});

// Закрытие: корутины будут отменены, а не zombie
$bgScope->disposeSafely();
```

## См. также

- [Scope::disposeSafely](/ru/docs/reference/scope/dispose-safely.html) — Безопасное закрытие scope
- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Принудительное закрытие scope
- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отмена всех корутин
