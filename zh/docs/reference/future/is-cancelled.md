---
layout: docs
lang: zh
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /zh/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "检查 Future 是否已取消。"
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

检查 `Future` 是否已被取消。Future 在调用 `cancel()` 方法后被视为已取消。

## 返回值

`bool` — 如果 Future 已被取消则返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 检查 Future 的取消状态

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### 示例 #2 完成与取消的区别

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## 参见

- [Future::cancel](/zh/docs/reference/future/cancel.html) — 取消 Future
- [Future::isCompleted](/zh/docs/reference/future/is-completed.html) — 检查 Future 是否已完成
