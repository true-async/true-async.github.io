---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "获取已完成任务的结果数组。"
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

返回成功完成的任务的结果数组。
数组的键与通过 `spawn()`（自动递增）或 `spawnWithKey()`（自定义）分配的键一致。

此方法不会等待任务完成 --- 它只返回调用时已有的结果。

## 返回值

`array<int|string, mixed>`，其中键是任务标识符，值是执行结果。

## 示例

### 示例 #1 在 all() 后获取结果

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### 示例 #2 结果不包含错误

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## 参见

- [TaskGroup::getErrors](/zh/docs/reference/task-group/get-errors.html) --- 获取错误数组
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
- [TaskGroup::suppressErrors](/zh/docs/reference/task-group/suppress-errors.html) --- 将错误标记为已处理
