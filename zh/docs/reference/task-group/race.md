---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "创建一个 Future，返回第一个完成的任务的结果。"
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

返回一个 `Future`，以第一个完成的任务的结果进行解析 --- 无论成功还是失败。
如果任务失败，`Future` 将以该异常拒绝。
其余任务**继续运行**。

如果已经有完成的任务，`Future` 会立即解析。

返回的 `Future` 支持通过 `await(?Completable $cancellation)` 传入取消令牌。

## 返回值

`Async\Future` --- 第一个完成的任务的 future 结果。
调用 `->await()` 获取值。

## 错误

- 如果组为空，抛出 `Async\AsyncException`。
- 如果第一个完成的任务失败，`Future` 将以该任务的异常拒绝。

## 示例

### 示例 #1 第一个响应

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### 示例 #2 带超时的对冲请求

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "没有副本在 2 秒内响应\n";
    }
});
```

## 参见

- [TaskGroup::any](/zh/docs/reference/task-group/any.html) --- 第一个成功的结果
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 所有结果
