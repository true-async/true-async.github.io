---
layout: docs
lang: zh
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /zh/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "返回子作用域数组。"
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

返回通过 `Scope::inherit()` 从给定作用域创建的所有子作用域的数组。适用于监控和调试作用域层次结构。

## 返回值

`array` — 作为给定作用域子级的 `Scope` 对象数组。

## 示例

### 示例 #1 获取子作用域

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### 示例 #2 监控子作用域状态

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancelled',
        $child->isFinished()  => 'finished',
        $child->isClosed()    => 'closed',
        default               => 'active',
    };
    echo "Scope: $status\n";
}
```

## 参见

- [Scope::inherit](/zh/docs/reference/scope/inherit.html) — 创建子作用域
- [Scope::setChildScopeExceptionHandler](/zh/docs/reference/scope/set-child-scope-exception-handler.html) — 子作用域的异常处理器
