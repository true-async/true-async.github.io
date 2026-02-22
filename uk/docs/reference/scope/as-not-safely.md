---
layout: docs
lang: uk
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /uk/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Позначає область видимості як небезпечну — корутини отримують скасування замість того, щоб стати зомбі."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Позначає область видимості як "небезпечну". Коли для такої області викликається `disposeSafely()`, корутини **не** стають зомбі, а натомість отримують сигнал скасування. Це корисно для фонових задач, які не потребують гарантованого завершення.

Метод повертає той самий об'єкт області видимості, що дозволяє використовувати ланцюжки методів (fluent interface).

## Значення, що повертається

`Scope` — той самий об'єкт області видимості (для ланцюжків методів).

## Приклади

### Приклад #1 Область видимості для фонових задач

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Background task: cache cleanup
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// With disposeSafely(), coroutines will be cancelled instead of becoming zombies
$scope->disposeSafely();
```

### Приклад #2 Використання з inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// On close: coroutines will be cancelled, not turned into zombies
$bgScope->disposeSafely();
```

## Дивіться також

- [Scope::disposeSafely](/uk/docs/reference/scope/dispose-safely.html) — Безпечне закриття області видимості
- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Примусове закриття області видимості
- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування всіх корутин
