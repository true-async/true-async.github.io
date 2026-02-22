---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "将所有当前错误标记为已处理。"
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

将组中所有当前错误标记为已处理。

当 TaskGroup 被销毁时，它会检查未处理的错误。如果错误未被处理
（通过 `all()`、`foreach` 或 `suppressErrors()`），析构函数会发出丢失错误的信号。
调用 `suppressErrors()` 是对错误已被处理的显式确认。

## 示例

### 示例 #1 选择性处理后抑制错误

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // 手动处理错误
    foreach ($group->getErrors() as $key => $error) {
        log_error("任务 $key: {$error->getMessage()}");
    }

    // 将错误标记为已处理
    $group->suppressErrors();
});
```

## 参见

- [TaskGroup::getErrors](/zh/docs/reference/task-group/get-errors.html) --- 获取错误数组
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
