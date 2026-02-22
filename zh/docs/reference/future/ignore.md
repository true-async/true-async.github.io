---
layout: docs
lang: zh
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /zh/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "不将未处理的错误传播到事件循环处理器。"
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

将 `Future` 标记为已忽略。如果 Future 以错误完成且该错误未被处理，它将不会被传递给事件循环的未处理异常处理器。适用于不关心结果的"发射后不管"任务。

## 返回值

`Future` — 返回同一个 Future，支持方法链式调用。

## 示例

### 示例 #1 忽略 Future 错误

```php
<?php

use Async\Future;

// Launch a task whose errors we don't care about
\Async\async(function() {
    // This operation may fail
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// The error will not be passed to the event loop handler
```

### 示例 #2 在方法链中使用 ignore

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // Cache errors are not critical
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## 参见

- [Future::catch](/zh/docs/reference/future/catch.html) — 处理 Future 的错误
- [Future::finally](/zh/docs/reference/future/finally.html) — Future 完成时的回调
