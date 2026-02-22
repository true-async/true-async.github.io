---
layout: docs
lang: zh
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /zh/docs/reference/context/find.html
page_title: "Context::find"
description: "在当前或父级上下文中按键查找值。"
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

在当前上下文中按键搜索值。如果未找到键，则继续沿父级上下文层级向上搜索。
如果在任何级别都未找到该值，则返回 `null`。

这是一种安全的搜索方法：当键不存在时不会抛出异常。

## 参数

**key**
: 要搜索的键。可以是字符串或对象。
  使用对象作为键时，按对象引用进行搜索。

## 返回值

与键关联的值，如果在当前或任何父级上下文中都未找到该键，
则返回 `null`。

## 示例

### 示例 #1 按字符串键搜索值

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // 子协程从父级上下文中找到值
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // 搜索不存在的键返回 null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### 示例 #2 按对象键搜索值

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // 按对象键引用搜索
    $logger = current_context()->find($loggerKey);
    $logger->info('Message from child coroutine');
});
```

### 示例 #3 层级搜索

```php
<?php

use function Async\current_context;
use function Async\spawn;

// 根级别
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // 第 1 级：添加自己的值
    current_context()->set('user_id', 42);

    spawn(function() {
        // 第 2 级：搜索所有级别的值
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## 参见

- [Context::get](/zh/docs/reference/context/get.html) --- 获取值（缺失时抛出异常）
- [Context::has](/zh/docs/reference/context/has.html) --- 检查键是否存在
- [Context::findLocal](/zh/docs/reference/context/find-local.html) --- 仅在本地上下文中搜索
- [Context::set](/zh/docs/reference/context/set.html) --- 在上下文中设置值
