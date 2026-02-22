---
layout: docs
lang: zh
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /zh/docs/reference/context/unset.html
page_title: "Context::unset"
description: "按键从上下文中删除值。"
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

按键从当前上下文中删除值。删除操作仅影响本地上下文
--- 父级上下文中的值不受影响。

该方法返回 `Context` 对象，允许方法链式调用。

## 参数

**key**
: 要删除的键。可以是字符串或对象。

## 返回值

用于方法链式调用的 `Context` 对象。

## 示例

### 示例 #1 从上下文中删除值

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// 删除临时数据
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### 示例 #2 使用对象键删除

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// 使用后删除敏感数据
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### 示例 #3 删除不影响父级上下文

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // 子上下文看到父级的值
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // 设置同名的本地值
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // 删除本地值
    current_context()->unset('shared');

    // 删除本地值后 — 通过 find() 再次可见父级值
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### 示例 #4 使用 unset 的方法链式调用

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// 链式清除多个键
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## 参见

- [Context::set](/zh/docs/reference/context/set.html) --- 在上下文中设置值
- [Context::find](/zh/docs/reference/context/find.html) --- 按键查找值
- [Context::findLocal](/zh/docs/reference/context/find-local.html) --- 在本地上下文中查找值
