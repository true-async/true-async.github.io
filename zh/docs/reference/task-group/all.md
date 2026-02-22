---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "创建一个 Future，在所有任务完成后返回结果数组。"
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

返回一个 `Future`，当所有任务完成时，它将以结果数组进行解析。
数组的键与通过 `spawn()` / `spawnWithKey()` 分配的键一致。

如果任务已经完成，`Future` 会立即解析。

返回的 `Future` 支持通过 `await(?Completable $cancellation)` 传入取消令牌，
允许你设置超时或其他取消策略。

## 参数

**ignoreErrors**
: 如果为 `false`（默认值）且存在错误，`Future` 将以 `CompositeException` 拒绝。
  如果为 `true`，错误将被忽略，`Future` 仅返回成功的结果。
  错误可以通过 `getErrors()` 获取。

## 返回值

`Async\Future` --- 包含任务结果数组的 future 结果。
调用 `->await()` 获取值。

## 错误

如果 `$ignoreErrors = false` 且至少一个任务失败，`Future` 将以 `Async\CompositeException` 拒绝。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### 示例 #2 错误处理

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### 示例 #3 忽略错误

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### 示例 #4 带超时等待

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "未能在 5 秒内获取数据\n";
    }
});
```

## 参见

- [TaskGroup::awaitCompletion](/zh/docs/reference/task-group/await-completion.html) --- 等待完成且不抛出异常
- [TaskGroup::getResults](/zh/docs/reference/task-group/get-results.html) --- 不等待直接获取结果
- [TaskGroup::getErrors](/zh/docs/reference/task-group/get-errors.html) --- 获取错误
