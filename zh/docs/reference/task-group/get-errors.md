---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "获取失败任务的错误数组。"
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

返回失败任务的异常（`Throwable`）数组。
数组的键与 `spawn()` 或 `spawnWithKey()` 中的任务键一致。

此方法不会等待任务完成 --- 它只返回调用时已有的错误。

## 返回值

`array<int|string, Throwable>`，其中键是任务标识符，值是异常。

## 示例

### 示例 #1 查看错误

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## 未处理的错误

如果 TaskGroup 销毁时仍有未处理的错误，析构函数会发出信号。
以下情况视为错误已被处理：

- 调用了 `all()` 且 `ignoreErrors: false`（默认），抛出了 `CompositeException`
- 调用了 `suppressErrors()`
- 通过迭代器（`foreach`）处理了错误

## 参见

- [TaskGroup::getResults](/zh/docs/reference/task-group/get-results.html) --- 获取结果数组
- [TaskGroup::suppressErrors](/zh/docs/reference/task-group/suppress-errors.html) --- 将错误标记为已处理
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
