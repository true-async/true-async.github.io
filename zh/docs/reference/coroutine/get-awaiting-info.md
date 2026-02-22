---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "获取协程正在等待的信息。"
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

返回协程当前正在等待的调试信息。适用于诊断卡住的协程。

## 返回值

`array` -- 包含等待信息的数组。如果信息不可用则返回空数组。

## 示例

### 示例 #1 诊断等待状态

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## 参见

- [Coroutine::isSuspended](/zh/docs/reference/coroutine/is-suspended.html) -- 检查挂起状态
- [Coroutine::getTrace](/zh/docs/reference/coroutine/get-trace.html) -- 调用栈
- [Coroutine::getSuspendLocation](/zh/docs/reference/coroutine/get-suspend-location.html) -- 挂起位置
