---
layout: docs
lang: zh
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /zh/docs/reference/protect.html
page_title: "protect()"
description: "protect() — 在不可取消模式下执行代码，保护关键区段。"
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — 在不可取消模式下执行闭包。协程的取消被延迟到闭包完成之后。

## 描述

```php
protect(\Closure $closure): mixed
```

在 `$closure` 执行期间，协程被标记为受保护状态。如果在此期间收到取消请求，`AsyncCancellation` 将仅在闭包完成**之后**被抛出。

## 参数

**`closure`**
要在不被取消中断的情况下执行的闭包。

## 返回值

返回闭包返回的值。

## 示例

### 示例 #1 保护事务

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// 如果在 protect() 期间协程被取消，
// AsyncCancellation 将在此处抛出 — 在 commit() 之后
?>
```

### 示例 #2 保护文件写入

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### 示例 #3 获取结果

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### 示例 #4 延迟取消与诊断

在 `protect()` 期间，取消被保存但不被应用。可以通过协程方法检查：

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // 在 cancel() 之后的 protect() 内部：
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Protected operation completed\n";
    });

    // AsyncCancellation 在此处抛出 — 在 protect() 之后
    echo "This code will not execute\n";
});

suspend(); // 让协程进入 protect()
$coroutine->cancel();
suspend(); // 让 protect() 完成

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — 在 `cancel()` 之后立即为 `true`，即使在 `protect()` 内部
- `isCancelled()` — 在 `protect()` 运行期间为 `false`，之后为 `true`

## 注意事项

> **注意：** 如果在 `protect()` 期间发生取消，`AsyncCancellation` 将在闭包返回后立即抛出 — 在这种情况下 `protect()` 的返回值将丢失。

> **注意：** `protect()` 不会使闭包成为原子操作 — 在闭包内部的 I/O 操作期间，其他协程可以执行。`protect()` 仅保证**取消**不会中断执行。

## 参见

- [Cancellation](/zh/docs/components/cancellation.html) — 协作取消机制
- [suspend()](/zh/docs/reference/suspend.html) — 挂起协程
