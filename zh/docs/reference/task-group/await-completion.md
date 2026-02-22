---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "等待所有任务完成，不抛出异常。"
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

等待组中所有任务完全完成。
与 `all()` 不同，它不返回结果，也不会因任务错误而抛出异常。

调用此方法前必须先密封组。

典型用例是在 `cancel()` 后等待协程真正结束。
`cancel()` 方法发起取消操作，但协程可能异步完成。
`awaitCompletion()` 保证所有协程已停止。

## 错误

如果组未密封，抛出 `Async\AsyncException`。

## 示例

### 示例 #1 取消后等待

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "所有协程已结束\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### 示例 #2 等待后获取结果

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // 不会抛出异常 --- 手动检查
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "成功: " . count($results) . "\n"; // 1
    echo "错误: " . count($errors) . "\n";  // 1
});
```

## 参见

- [TaskGroup::all](/zh/docs/reference/task-group/all.html) --- 等待所有任务并获取结果
- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) --- 取消所有任务
- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) --- 密封组
