---
layout: docs
lang: zh
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /zh/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — 等待第一个完成的任务。"
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — 等待**第一个**完成的任务。如果第一个完成的任务抛出了异常，该异常将被传播。

## 描述

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## 参数

**`triggers`**
`Async\Completable` 对象的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消等待。

## 返回值

第一个完成的任务的结果。

## 错误/异常

如果第一个完成的任务抛出了异常，该异常将被传播。

## 示例

### 示例 #1 请求竞争

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// 最先响应的镜像获胜
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Received response from the fastest mirror\n";
?>
```

## 注意事项

> **注意：** `triggers` 参数接受任何 `iterable`，包括 `Iterator` 实现。参见 [Iterator 示例](/zh/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)。

## 参见

- [await_first_success()](/zh/docs/reference/await-first-success.html) — 第一个成功，忽略错误
- [await_all_or_fail()](/zh/docs/reference/await-all-or-fail.html) — 所有任务
