---
layout: docs
lang: zh
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /zh/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "创建一个绑定到 FutureState 的 Future。"
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

创建一个绑定到 `FutureState` 对象的新 `Future`。`FutureState` 管理 Future 的状态，并允许从外部以结果或错误完成它。

## 参数

`state` — 管理此 Future 状态的 `FutureState` 对象。

## 示例

### 示例 #1 通过 FutureState 创建 Future

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

### 示例 #2 创建延迟结果的 Future

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

## 参见

- [Future::completed](/zh/docs/reference/future/completed.html) — 创建一个已完成的 Future
- [Future::failed](/zh/docs/reference/future/failed.html) — 创建一个带错误的 Future
