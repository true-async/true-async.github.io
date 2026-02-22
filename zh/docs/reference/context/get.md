---
layout: docs
lang: zh
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /zh/docs/reference/context/get.html
page_title: "Context::get"
description: "从上下文获取值。如果未找到键则抛出异常。"
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

从当前上下文中按键获取值。如果在当前级别未找到键，
则继续沿父级上下文层级向上搜索。

与 `find()` 不同，如果在任何级别都未找到键，此方法将抛出异常。
当值的存在是必要条件时，请使用 `get()`。

## 参数

**key**
: 要搜索的键。可以是字符串或对象。
  使用对象作为键时，按对象引用进行搜索。

## 返回值

与键关联的值。

## 错误

- 如果在当前或任何父级上下文中都未找到键，抛出 `Async\ContextException`。

## 示例

### 示例 #1 获取必需的值

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // 获取必须存在的值
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### 示例 #2 处理缺失的键

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Key not found: " . $e->getMessage() . "\n";
}
```

### 示例 #3 使用对象键

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // 对象键确保唯一性，避免名称冲突
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## 参见

- [Context::find](/zh/docs/reference/context/find.html) --- 安全搜索（返回 null）
- [Context::has](/zh/docs/reference/context/has.html) --- 检查键是否存在
- [Context::getLocal](/zh/docs/reference/context/get-local.html) --- 仅从本地上下文获取值
- [Context::set](/zh/docs/reference/context/set.html) --- 在上下文中设置值
