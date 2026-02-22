---
layout: docs
lang: zh
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /zh/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — 等待所有任务完成；遇到第一个错误即抛出异常。"
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — 等待**所有**任务成功完成。遇到第一个错误时抛出异常并取消剩余任务。

## 描述

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## 参数

**`triggers`**
`Async\Completable` 对象（协程、Future 等）的可迭代集合。

**`cancellation`**
可选的 Awaitable，用于取消整个等待（例如 `timeout()`）。

**`preserveKeyOrder`**
如果为 `true`（默认），结果按输入数组的键顺序返回。如果为 `false`，按完成顺序返回。

## 返回值

所有任务结果的数组。键与输入数组的键对应。

## 错误/异常

抛出第一个失败任务的异常。

## 示例

### 示例 #1 并行加载数据

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### 示例 #2 带超时

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all tasks completed within 5 seconds\n";
}
?>
```

### 示例 #3 使用 Iterator 代替数组

所有 `await_*` 系列函数不仅接受数组，还接受任何 `iterable`，包括 `Iterator` 实现。这允许动态生成协程：

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## 参见

- [await_all()](/zh/docs/reference/await-all.html) — 所有任务，容忍错误
- [await()](/zh/docs/reference/await.html) — 等待单个任务
