---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "获取迭代器，按任务完成顺序遍历结果。"
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

返回一个迭代器，**按任务完成顺序**产出结果。
TaskGroup 实现了 `IteratorAggregate`，因此可以直接使用 `foreach`。

## 迭代器行为

- `foreach` 会挂起当前协程，直到下一个结果可用
- 键与通过 `spawn()` 或 `spawnWithKey()` 分配的键一致
- 值是数组 `[mixed $result, ?Throwable $error]`：
  - 成功: `[$result, null]`
  - 错误: `[null, $error]`
- 当组被密封**且**所有任务都已处理时，迭代结束
- 如果组未密封，`foreach` 会挂起等待新任务

> **重要：** 如果不调用 `seal()`，迭代将无限期等待。

## 示例

### 示例 #1 按完成顺序处理结果

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "任务 $key 失败: {$error->getMessage()}\n";
            continue;
        }
        echo "任务 $key 完成\n";
    }
});
```

### 示例 #2 使用命名键迭代

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: 收到 " . count($result) . " 条记录\n";
        }
    }
});
```

## 参见

- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) --- 密封组
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
- [TaskGroup::getResults](/zh/docs/reference/task-group/get-results.html) --- 获取结果数组
