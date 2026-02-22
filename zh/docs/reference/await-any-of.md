---
layout: docs
lang: zh
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /zh/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — 等待前 N 个任务完成，容忍部分失败。"
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — 等待**前 N 个**任务完成，分别收集结果和错误。单个任务失败时不会抛出异常。

## 描述

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## 参数

**`count`**
要等待的成功结果数量。

**`triggers`**
`Async\Completable` 对象的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消等待。

**`preserveKeyOrder`**
如果为 `true`，结果键与输入数组的键对应。

**`fillNull`**
如果为 `true`，失败任务的结果数组中放置 `null`。

## 返回值

包含两个元素的数组：`[$results, $errors]`

- `$results` — 成功结果数组（最多 `$count` 个元素）
- `$errors` — 失败任务的异常数组

## 示例

### 示例 #1 容错的仲裁机制

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// 等待仲裁：5 个中的 3 个响应
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quorum reached\n";
} else {
    echo "Quorum not reached, errors: " . count($errors) . "\n";
}
?>
```

## 注意事项

> **注意：** `triggers` 参数接受任何 `iterable`，包括 `Iterator` 实现。参见 [Iterator 示例](/zh/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)。

## 参见

- [await_any_of_or_fail()](/zh/docs/reference/await-any-of-or-fail.html) — 前 N 个，出错则中止
- [await_all()](/zh/docs/reference/await-all.html) — 所有任务，容忍错误
