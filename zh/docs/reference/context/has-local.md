---
layout: docs
lang: zh
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /zh/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "检查键是否仅存在于本地上下文中。"
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

检查具有指定键的值是否**仅**存在于当前（本地）上下文中。
与 `has()` 不同，此方法不会在父级上下文中搜索。

## 参数

**key**
: 要检查的键。可以是字符串或对象。

## 返回值

如果在本地上下文中找到该键，返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 has 和 hasLocal 的区别

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() 沿层级向上搜索
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() 仅检查当前级别
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### 示例 #2 使用对象键检查

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### 示例 #3 有条件地初始化本地值

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // 仅在本地未设置时初始化值
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## 参见

- [Context::has](/zh/docs/reference/context/has.html) --- 带层级遍历的检查
- [Context::findLocal](/zh/docs/reference/context/find-local.html) --- 在本地上下文中查找值
- [Context::getLocal](/zh/docs/reference/context/get-local.html) --- 获取本地值（抛出异常）
