---
layout: docs
lang: uk
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /uk/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Закриває область видимості після зазначеного тайм-ауту."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Планує закриття області видимості після зазначеного тайм-ауту. Коли тайм-аут спливає, викликається `dispose()`, що скасовує всі корутини та закриває область видимості. Це зручно для встановлення максимального часу існування області видимості.

## Параметри

`timeout` — час у мілісекундах до автоматичного закриття області видимості.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Обмеження часу виконання

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope will be closed after 10 seconds
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Long operation
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### Приклад #2 Область видимості з обмеженим часом існування

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 seconds for all work

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Won't finish in time
    echo "Task 3: OK\n"; // Will not be printed
});

$scope->awaitCompletion();
```

## Дивіться також

- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Негайне закриття області видимості
- [Scope::disposeSafely](/uk/docs/reference/scope/dispose-safely.html) — Безпечне закриття області видимості
- [timeout()](/uk/docs/reference/timeout.html) — Глобальна функція тайм-ауту
