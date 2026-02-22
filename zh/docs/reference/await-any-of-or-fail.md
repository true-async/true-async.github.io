---
layout: docs
lang: zh
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /zh/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — 等待前 N 个成功完成的任务。"
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — 等待**前 N 个**任务成功完成。如果前 N 个中有一个失败，则抛出异常。

## 描述

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## 参数

**`count`**
要等待的成功结果数量。如果为 `0`，返回空数组。

**`triggers`**
`Async\Completable` 对象的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消等待。

**`preserveKeyOrder`**
如果为 `true`，结果键与输入数组的键对应。如果为 `false`，按完成顺序排列。

## 返回值

包含 `$count` 个成功结果的数组。

## 错误/异常

如果在达到 `$count` 个成功之前有任务失败，则抛出该异常。

## 示例

### 示例 #1 从 5 个中获取 2 个结果

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// 等待任意 2 个成功响应
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## 注意事项

> **注意：** `triggers` 参数接受任何 `iterable`，包括 `Iterator` 实现。参见 [Iterator 示例](/zh/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)。

## 参见

- [await_any_of()](/zh/docs/reference/await-any-of.html) — 前 N 个，容忍错误
- [await_all_or_fail()](/zh/docs/reference/await-all-or-fail.html) — 所有任务
