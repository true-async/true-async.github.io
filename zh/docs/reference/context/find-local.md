---
layout: docs
lang: zh
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /zh/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "仅在本地上下文中查找值（不搜索父级上下文）。"
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

**仅**在当前（本地）上下文中按键搜索值。与 `find()` 不同，
此方法不会沿父级上下文层级向上搜索。

如果在当前级别未找到键，则返回 `null`。

## 参数

**key**
: 要搜索的键。可以是字符串或对象。

## 返回值

本地上下文中与键关联的值，如果未找到该键则返回 `null`。

## 示例

### 示例 #1 find 和 findLocal 的区别

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() 沿层级向上搜索
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() 仅在当前级别搜索
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### 示例 #2 使用对象键

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // 父级的对象键通过 findLocal 不可见
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### 示例 #3 覆盖父级值

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // 检查值是否在本地被覆盖
    if (current_context()->findLocal('timeout') === null) {
        // 使用继承的值，但可以覆盖
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## 参见

- [Context::find](/zh/docs/reference/context/find.html) --- 带层级遍历的搜索
- [Context::getLocal](/zh/docs/reference/context/get-local.html) --- 获取本地值（抛出异常）
- [Context::hasLocal](/zh/docs/reference/context/has-local.html) --- 检查本地上下文中的键
