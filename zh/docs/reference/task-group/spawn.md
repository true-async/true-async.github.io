---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "以自动递增的键向组中添加任务。"
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

以自动递增的键（0, 1, 2, ...）向组中添加一个可调用对象。

如果未设置并发限制或有可用槽位，协程会立即创建。
否则，可调用对象及其参数会放入队列，在有空闲槽位时自动启动。

## 参数

**task**
: 要执行的可调用对象。接受任何可调用类型：Closure、函数、方法。

**args**
: 传递给可调用对象的参数。

## 错误

如果组已密封（`seal()`）或已取消（`cancel()`），抛出 `Async\AsyncException`。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### 示例 #2 带参数

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## 参见

- [TaskGroup::spawnWithKey](/zh/docs/reference/task-group/spawn-with-key.html) --- 以显式键添加任务
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务
