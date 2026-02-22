---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "将协程标记为调度器的高优先级任务。"
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

将协程标记为高优先级。调度器在选择下一个执行任务时会优先考虑此类协程。

该方法返回同一个协程对象，支持链式调用。

## 返回值

`Coroutine` -- 同一个协程对象（链式接口）。

## 示例

### 示例 #1 设置优先级

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### 示例 #2 链式调用

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## 参见

- [spawn()](/zh/docs/reference/spawn.html) -- 创建协程
