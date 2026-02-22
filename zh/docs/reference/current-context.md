---
layout: docs
lang: zh
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /zh/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — 获取当前 Scope 的上下文。"
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — 返回绑定到当前 Scope 的 `Async\Context` 对象。

## 描述

```php
current_context(): Async\Context
```

如果当前 Scope 的上下文尚未创建，则会自动创建。
在此上下文中设置的值对当前 Scope 中的所有协程通过 `find()` 可见。

## 返回值

一个 `Async\Context` 对象。

## 示例

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // 可以看到父作用域中的值
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## 参见

- [coroutine_context()](/zh/docs/reference/coroutine-context.html) — 协程上下文
- [root_context()](/zh/docs/reference/root-context.html) — 全局上下文
- [Context](/zh/docs/components/context.html) — 上下文概念
