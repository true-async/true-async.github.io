---
layout: docs
lang: zh
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /zh/docs/reference/future/await.html
page_title: "Future::await"
description: "等待 Future 的结果。"
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

等待 `Future` 完成并返回其结果。阻塞当前协程直到 Future 完成。如果 Future 以错误完成，该方法将抛出该异常。可以传入一个 `Completable` 对象，通过超时或外部条件来取消等待。

## 参数

`cancellation` — 等待取消对象。如果提供了该参数并且在 Future 完成之前被触发，将抛出 `CancelledException`。默认为 `null`。

## 返回值

`mixed` — Future 的结果。

## 错误

如果 Future 以错误完成或被取消，将抛出异常。

## 示例

### 示例 #1 基本的结果等待

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### 示例 #2 等待时处理错误

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## 参见

- [Future::isCompleted](/zh/docs/reference/future/is-completed.html) — 检查 Future 是否已完成
- [Future::cancel](/zh/docs/reference/future/cancel.html) — 取消 Future
- [Future::map](/zh/docs/reference/future/map.html) — 转换结果
