---
layout: docs
lang: uk
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /uk/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Створює Future, прив'язаний до FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Створює новий `Future`, прив'язаний до об'єкта `FutureState`. `FutureState` керує станом Future та дозволяє завершити його ззовні з результатом або помилкою.

## Параметри

`state` — об'єкт `FutureState`, що керує станом цього Future.

## Приклади

### Приклад #1 Створення Future через FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Complete the Future from another coroutine
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Await the result
$value = $future->await();
echo "Received: $value\n";
```

### Приклад #2 Створення Future з відкладеним результатом

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// One coroutine awaits the result
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Result: $result\n";
});

// Another coroutine provides the result
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Done!");
});
```

## Дивіться також

- [Future::completed](/uk/docs/reference/future/completed.html) — Створити вже завершений Future
- [Future::failed](/uk/docs/reference/future/failed.html) — Створити Future з помилкою
