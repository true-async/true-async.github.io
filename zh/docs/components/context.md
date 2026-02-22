---
layout: docs
lang: zh
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /zh/docs/components/context.html
page_title: "上下文"
description: "TrueAsync 中的上下文 -- 在作用域层级中存储数据、本地值和继承值，类似于 Go 的 context.Context。"
---

# Context：执行上下文

## 为什么需要这个

有一个 `API` 服务类需要执行与授权令牌关联的操作。
然而，将令牌传递给服务的每个方法并不是好主意。
在 `PHP` 中，这个问题通过全局变量或静态类属性来解决。
但在异步环境中，单个进程可以处理不同的请求，这种方式行不通，
因为在调用时，无法确定正在处理哪个请求。

`Async\Context` 允许存储与协程或 `Scope` 关联的数据，并基于执行上下文构建应用程序逻辑。

## 什么是上下文

`Async\Context` 是一个绑定到 `Scope` 或协程的键值存储。
上下文形成层级结构：读取值时，搜索沿着作用域树向上进行。

这类似于 `Go` 中的 `context.Context` 或 `Kotlin` 中的 `CoroutineContext`。
一种无需显式传递参数即可通过层级传递数据的机制。

## 三个层级的上下文

`TrueAsync` 提供三个函数来访问上下文：

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// 当前 Scope 的上下文
$scopeCtx = current_context();

// 当前协程的上下文
$coroCtx = coroutine_context();

// 全局根上下文
$rootCtx = root_context();
?>
```

### current_context()

返回当前 `Scope` 的上下文。如果上下文尚未创建，会自动创建一个。
在这里设置的值对此 Scope 中的所有协程可见。

### coroutine_context()

返回当前协程的上下文。这是一个**私有**上下文，仅属于此协程。
其他协程无法看到在此处设置的数据。

### root_context()

返回全局上下文，在整个请求中共享。此处的值可以通过任何上下文的 `find()` 方法查看。

## 键

键可以是**字符串**或**对象**：

```php
<?php
use function Async\current_context;

$ctx = current_context();

// 字符串键
$ctx->set('request_id', 'abc-123');

// 对象作为键（适用于唯一令牌）
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

对象键在上下文中按引用存储，这保证了它们的唯一性。

## 读取：本地和层级

### find() / get() / has() -- 层级搜索

首先在当前上下文中搜索值，然后在父级中搜索，一直到根：

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() 沿层级向上搜索
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- 在 root_context 中找到
});
?>
```

### findLocal() / getLocal() / hasLocal() -- 仅当前上下文

**仅**在当前上下文中搜索值，不沿层级向上搜索：

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- 此值未在当前 Scope 中设置

$inherited = current_context()->find('app_name');
// "MyApp" -- 在父作用域中找到
?>
```

## 写入和删除

### set()

```php
<?php
$ctx = current_context();

// 设置值（默认 replace = false）
$ctx->set('key', 'value');

// 不带 replace 重复设置 -- 错误
$ctx->set('key', 'new_value'); // Error: A context key already exists

// 显式 replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

`set()` 方法返回 `$this`，允许链式调用：

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

`unset()` 方法也返回 `$this`。

## 实际示例

### 传递请求 ID

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// 中间件设置 request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// 此作用域中的任何协程都可以读取它
spawn(function() {
    $requestId = current_context()->find('request_id');
    // 用于日志记录
    error_log("[$requestId] Processing request...");
});
?>
```

### 协程上下文作为私有存储

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... 执行工作
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // 无法看到 c1 的 'step'
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### 通过 root_context 进行配置

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// 在请求开始时设置
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// 从任何协程都可以访问
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## 另请参阅

- [Scope](/zh/docs/components/scope.html) -- 管理协程生命周期
- [协程](/zh/docs/components/coroutines.html) -- 基本并发单元
- [current_context()](/zh/docs/reference/current-context.html) -- 获取当前 Scope 的上下文
