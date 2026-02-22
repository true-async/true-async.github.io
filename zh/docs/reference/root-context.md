---
layout: docs
lang: zh
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /zh/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — 获取对所有作用域可见的全局根上下文。"
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — 返回全局根 `Async\Context` 对象，在整个请求中共享。

## 描述

```php
root_context(): Async\Context
```

返回顶层上下文。在此处设置的值可通过层次结构中任何上下文的 `find()` 访问。

## 返回值

一个 `Async\Context` 对象。

## 示例

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// 设置全局配置
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // 从任何协程通过 find() 可访问
    $env = current_context()->find('environment'); // "production"
});
?>
```

## 参见

- [current_context()](/zh/docs/reference/current-context.html) — 作用域上下文
- [coroutine_context()](/zh/docs/reference/coroutine-context.html) — 协程上下文
- [Context](/zh/docs/components/context.html) — 上下文概念
