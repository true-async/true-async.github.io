---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "创建一个 Future，返回第一个成功任务的结果。"
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

返回一个 `Future`，以第一个*成功*完成的任务的结果进行解析。
失败的任务会被跳过。
其余任务**继续运行**。

如果所有任务都失败，`Future` 将以 `CompositeException` 拒绝。

返回的 `Future` 支持通过 `await(?Completable $cancellation)` 传入取消令牌。

## 返回值

`Async\Future` --- 第一个成功任务的 future 结果。
调用 `->await()` 获取值。

## 错误

- 如果组为空，抛出 `Async\AsyncException`。
- 如果所有任务都失败，`Future` 将以 `Async\CompositeException` 拒绝。

## 示例

### 示例 #1 第一个成功的任务

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // 失败任务的错误必须显式抑制
    $group->suppressErrors();
});
```

### 示例 #2 全部失败

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " 个错误\n"; // "2 个错误"
    }
});
```

### 示例 #3 带超时的容错搜索

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "没有搜索引擎在 3 秒内响应\n";
    }

    $group->suppressErrors();
});
```

## 参见

- [TaskGroup::race](/zh/docs/reference/task-group/race.html) --- 第一个完成的（无论成功或失败）
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 所有结果
