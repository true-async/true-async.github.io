---
layout: docs
lang: ru
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /ru/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Создаёт Future, привязанный к FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Создаёт новый `Future`, привязанный к объекту `FutureState`. `FutureState` управляет состоянием Future и позволяет завершить его извне с результатом или ошибкой.

## Параметры

`state` — объект `FutureState`, управляющий состоянием данного Future.

## Примеры

### Пример #1 Создание Future через FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Завершаем Future из другой корутины
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Ожидаем результат
$value = $future->await();
echo "Получено: $value\n";
```

### Пример #2 Создание Future с отложенным результатом

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

// Одна корутина ожидает результат
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Результат: $result\n";
});

// Другая корутина предоставляет результат
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Готово!");
});
```

## См. также

- [Future::completed](/ru/docs/reference/future/completed.html) — Создать уже завершённый Future
- [Future::failed](/ru/docs/reference/future/failed.html) — Создать Future с ошибкой
