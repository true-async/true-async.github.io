---
layout: docs
lang: zh
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /zh/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — 在指定的 Scope 或通过 ScopeProvider 启动协程。"
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — 在绑定到指定 `Scope` 或 `ScopeProvider` 的新协程中启动函数。

## 描述

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

在 `$provider` 提供的 Scope 中创建并启动新协程。这允许显式控制协程将在哪个 Scope 中运行。

## 参数

**`provider`**
实现 `Async\ScopeProvider` 接口的对象。通常为：
- `Async\Scope` — 直接使用，因为 `Scope` 实现了 `ScopeProvider`
- 实现 `ScopeProvider` 的自定义类
- 实现 `SpawnStrategy` 的对象，用于生命周期管理

**`task`**
在协程中执行的函数或闭包。

**`args`**
传递给 `task` 的可选参数。

## 返回值

返回一个表示已启动协程的 `Async\Coroutine` 对象。

## 错误/异常

- `Async\AsyncException` — 如果 Scope 已关闭或已取消
- `TypeError` — 如果 `$provider` 未实现 `ScopeProvider`

## 示例

### 示例 #1 在指定 Scope 中启动

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// 等待作用域中所有协程完成
$scope->awaitCompletion();
?>
```

### 示例 #2 继承的 Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Working in child Scope\n";
});

// 取消父级也会取消子级
$parentScope->cancel();
?>
```

### 示例 #3 使用 ScopeProvider

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker error: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // 在受管 Scope 中工作
});

$worker->shutdown();
?>
```

### 示例 #4 传递参数

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // 使用传入的参数
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## 注意事项

> **注意：** 如果 `ScopeProvider::provideScope()` 返回 `null`，协程将在当前 Scope 中创建。

> **注意：** 不能在已关闭或已取消的 Scope 中创建协程 — 将抛出异常。

## 参见

- [spawn()](/zh/docs/reference/spawn.html) — 在当前 Scope 中启动协程
- [Scope](/zh/docs/components/scope.html) — 管理协程生命周期
- [Interfaces](/zh/docs/components/interfaces.html) — ScopeProvider 和 SpawnStrategy
