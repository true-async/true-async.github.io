---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — 获取当前协程的私有上下文。"
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — 返回绑定到当前协程的 `Async\Context` 对象。

## 描述

```php
coroutine_context(): Async\Context
```

返回当前协程的**私有**上下文。在此处设置的数据对其他协程不可见。如果协程的上下文尚未创建，则会自动创建。

## 返回值

一个 `Async\Context` 对象。

## 示例

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // 稍后在同一协程中
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // 无法看到另一个协程中的 'step'
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## 参见

- [current_context()](/zh/docs/reference/current-context.html) — 作用域上下文
- [root_context()](/zh/docs/reference/root-context.html) — 全局上下文
- [Context](/zh/docs/components/context.html) — 上下文概念
