---
layout: docs
lang: zh
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /zh/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "检查 Future 是否已完成。"
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

检查 `Future` 是否已完成。如果 Future 包含结果、错误或已被取消，则视为已完成。

## 返回值

`bool` — 如果 Future 已完成（成功、错误或取消）则返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 检查 Future 的完成状态

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### 示例 #2 检查静态工厂方法

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## 参见

- [Future::isCancelled](/zh/docs/reference/future/is-cancelled.html) — 检查 Future 是否已取消
- [Future::await](/zh/docs/reference/future/await.html) — 等待 Future 的结果
