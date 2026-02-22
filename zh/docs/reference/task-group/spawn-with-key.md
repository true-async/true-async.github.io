---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "以显式键向组中添加任务。"
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

以指定的键向组中添加一个可调用对象。
任务结果可通过此键在 `all()`、`getResults()` 及迭代中访问。

## 参数

**key**
: 任务键。字符串或整数。不允许重复。

**task**
: 要执行的可调用对象。

**args**
: 传递给可调用对象的参数。

## 错误

如果组已密封或键已存在，抛出 `Async\AsyncException`。

## 示例

### 示例 #1 命名任务

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## 参见

- [TaskGroup::spawn](/zh/docs/reference/task-group/spawn.html) --- 以自动递增键添加任务
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
