---
layout: docs
lang: zh
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /zh/docs/reference/context/has.html
page_title: "Context::has"
description: "检查键是否存在于当前或父级上下文中。"
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

检查具有指定键的值是否存在于当前上下文或某个父级上下文中。
搜索沿层级向上进行。

## 参数

**key**
: 要检查的键。可以是字符串或对象。

## 返回值

如果在当前或任何父级上下文中找到该键，返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 使用前检查键

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale not set, using default\n";
    }
});
```

### 示例 #2 使用对象键检查

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Cache is available\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### 示例 #3 层级检查

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (来自根级)
        var_dump(current_context()->has('local_flag'));   // true (来自父级)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## 参见

- [Context::find](/zh/docs/reference/context/find.html) --- 按键查找值
- [Context::get](/zh/docs/reference/context/get.html) --- 获取值（抛出异常）
- [Context::hasLocal](/zh/docs/reference/context/has-local.html) --- 仅在本地上下文中检查
