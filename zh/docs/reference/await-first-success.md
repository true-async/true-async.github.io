---
layout: docs
lang: zh
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /zh/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — 等待第一个成功完成的任务，忽略其他任务的错误。"
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — 等待**第一个成功**完成的任务。其他任务的错误被单独收集，不会中断等待。

## 描述

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## 参数

**`triggers`**
`Async\Completable` 对象的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消等待。

## 返回值

包含两个元素的数组：`[$result, $errors]`

- `$result` — 第一个成功完成的任务的结果（如果所有任务都失败则为 `null`）
- `$errors` — 在第一个成功之前失败的任务的异常数组

## 示例

### 示例 #1 容错请求

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// 尝试多个服务器；取第一个成功的响应
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Data received\n";
} else {
    echo "All servers unavailable\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## 注意事项

> **注意：** `triggers` 参数接受任何 `iterable`，包括 `Iterator` 实现。参见 [Iterator 示例](/zh/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)。

## 参见

- [await_any_or_fail()](/zh/docs/reference/await-any-or-fail.html) — 第一个任务，出错则中止
- [await_all()](/zh/docs/reference/await-all.html) — 所有任务，容忍错误
