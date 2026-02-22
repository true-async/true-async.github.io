---
layout: docs
lang: zh
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /zh/docs/reference/context/set.html
page_title: "Context::set"
description: "按键在上下文中设置值。"
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

使用指定的键在当前上下文中设置值。默认情况下，如果键已存在，
值**不会被覆盖**。要强制覆盖，请使用 `replace = true` 参数。

该方法返回 `Context` 对象，允许方法链式调用。

## 参数

**key**
: 要设置值的键。可以是字符串或对象。
  对象键有助于避免库之间的名称冲突。

**value**
: 要存储的值。可以是任意类型。

**replace**
: 如果为 `false`（默认）--- 不覆盖已存在的值。
  如果为 `true` --- 即使键已存在也覆盖该值。

## 返回值

用于方法链式调用的 `Context` 对象。

## 示例

### 示例 #1 使用字符串键设置值

```php
<?php

use function Async\current_context;

// 方法链式调用
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### 示例 #2 不覆盖时的行为

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// 不使用 replace 再次设置 — 值不会改变
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// 使用 replace = true — 值被覆盖
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### 示例 #3 使用对象键实现库隔离

```php
<?php

use function Async\current_context;
use function Async\spawn;

// 每个库使用自己的对象键
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialized');
});
```

### 示例 #4 向子协程传递上下文

```php
<?php

use function Async\current_context;
use function Async\spawn;

// 父级上下文
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// 子协程通过 find() 继承值
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Processing request: {$traceId}\n";

    // 子协程添加自己的值
    current_context()->set('handler', 'user_controller');
});
```

## 参见

- [Context::unset](/zh/docs/reference/context/unset.html) --- 按键删除值
- [Context::find](/zh/docs/reference/context/find.html) --- 按键查找值
- [Context::get](/zh/docs/reference/context/get.html) --- 获取值（抛出异常）
- [current_context()](/zh/docs/reference/current-context.html) --- 获取当前 Scope 上下文
