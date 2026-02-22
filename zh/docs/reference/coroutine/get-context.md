---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "获取协程的本地上下文。"
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

返回协程的本地上下文。上下文在首次访问时惰性创建。

上下文允许存储绑定到特定协程的数据，并将其传递给子协程。

## 返回值

`Async\Context` -- 协程的上下文对象。

## 示例

### 示例 #1 访问上下文

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## 参见

- [Context](/zh/docs/components/context.html) -- 上下文概念
- [current_context()](/zh/docs/reference/current-context.html) -- 获取当前协程的上下文
