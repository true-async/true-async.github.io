---
layout: docs
lang: zh
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /zh/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "ScopeProvider 接口实现——返回当前作用域。"
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

`ScopeProvider` 接口的实现。返回作用域对象自身。这使得 `Scope` 可以在任何需要 `ScopeProvider` 的地方使用。

## 返回值

`Scope` — 当前作用域对象。

## 示例

### 示例 #1 作为 ScopeProvider 使用

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "Running in the provided scope\n";
    });
}

$scope = new Scope();

// Scope itself implements ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### 示例 #2 ScopeProvider 多态性

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

class ServiceContainer implements ScopeProvider {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope {
        return $this->scope;
    }
}

function startWorkers(ScopeProvider $provider, int $count): void {
    $scope = $provider->provideScope();

    for ($i = 0; $i < $count; $i++) {
        $scope->spawn(function() use ($i) {
            echo "Worker $i started\n";
        });
    }
}

// Works with both Scope and ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## 参见

- [Scope::inherit](/zh/docs/reference/scope/inherit.html) — 创建子作用域
- [Scope::spawn](/zh/docs/reference/scope/spawn.html) — 在作用域中生成协程
