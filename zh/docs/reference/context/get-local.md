---
layout: docs
lang: zh
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /zh/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "仅从本地上下文获取值。如果未找到则抛出异常。"
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

**仅**从当前（本地）上下文中按键获取值。
与 `get()` 不同，此方法不会在父级上下文中搜索。

如果在当前级别未找到键，将抛出异常。

## 参数

**key**
: 要搜索的键。可以是字符串或对象。

## 返回值

本地上下文中与键关联的值。

## 错误

- 如果在本地上下文中未找到键，抛出 `Async\ContextException`。

## 示例

### 示例 #1 获取本地值

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // 值在本地设置 — getLocal 可以正常工作
    $taskId = current_context()->getLocal('task_id');
    echo "Task: {$taskId}\n"; // "Task: 42"
});
```

### 示例 #2 访问继承的键时抛出异常

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() 会在父级中找到该值
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() 抛出异常 — 值不在本地上下文中
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Not found locally: " . $e->getMessage() . "\n";
    }
});
```

### 示例 #3 使用对象键

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "User: " . $session['user'] . "\n"; // "User: admin"
});
```

## 参见

- [Context::get](/zh/docs/reference/context/get.html) --- 带层级搜索的获取值
- [Context::findLocal](/zh/docs/reference/context/find-local.html) --- 在本地上下文中安全搜索
- [Context::hasLocal](/zh/docs/reference/context/has-local.html) --- 检查本地上下文中的键
