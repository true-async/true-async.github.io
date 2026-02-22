---
layout: docs
lang: uk
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /uk/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Очікує завершення активних корутин в області видимості."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Очікує завершення всіх **активних** корутин в області видимості. Зомбі-корутини не враховуються при очікуванні. Параметр `$cancellation` дозволяє перервати очікування достроково.

## Параметри

`cancellation` — об'єкт `Awaitable`, який при спрацюванні перерве очікування.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Очікування завершення всіх корутин

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// Wait for completion with a 5-second timeout
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### Приклад #2 Переривання очікування

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Very long task
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## Дивіться також

- [Scope::awaitAfterCancellation](/uk/docs/reference/scope/await-after-cancellation.html) — Очікування всіх корутин, включаючи зомбі
- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування всіх корутин
- [Scope::isFinished](/uk/docs/reference/scope/is-finished.html) — Перевірка, чи завершена область видимості
