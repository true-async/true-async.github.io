---
layout: docs
lang: zh
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /zh/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — 等待所有任务完成，容忍部分失败。"
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — 等待**所有**任务完成，分别收集结果和错误。单个任务失败时不会抛出异常。

## 描述

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## 参数

**`triggers`**
`Async\Completable` 对象的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消整个等待。

**`preserveKeyOrder`**
如果为 `true`（默认），结果按输入数组的键顺序排列。如果为 `false`，按完成顺序排列。

**`fillNull`**
如果为 `true`，失败任务的结果数组中放置 `null`。如果为 `false`（默认），错误对应的键被省略。

## 返回值

包含两个元素的数组：`[$results, $errors]`

- `$results` — 成功结果数组
- `$errors` — 异常数组（键与输入任务的键对应）

## 示例

### 示例 #1 容忍部分失败

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results 包含 'fast' 和 'slow'
// $errors 包含 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Task '$key' failed: {$error->getMessage()}\n";
}
?>
```

### 示例 #2 使用 fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null（而不是缺少该键）
?>
```

## 注意事项

> **注意：** `triggers` 参数接受任何 `iterable`，包括 `Iterator` 实现。协程可以在迭代过程中动态创建。参见 [Iterator 示例](/zh/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)。

## 参见

- [await_all_or_fail()](/zh/docs/reference/await-all-or-fail.html) — 所有任务，出错则中止
- [await_any_or_fail()](/zh/docs/reference/await-any-or-fail.html) — 第一个结果
