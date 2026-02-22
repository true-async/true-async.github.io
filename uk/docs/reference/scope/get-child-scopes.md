---
layout: docs
lang: uk
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /uk/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Повертає масив дочірніх областей видимості."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Повертає масив усіх дочірніх областей видимості, створених через `Scope::inherit()` від даної області. Корисно для моніторингу та відлагодження ієрархії областей видимості.

## Значення, що повертається

`array` — масив об'єктів `Scope`, які є дочірніми до даної області видимості.

## Приклади

### Приклад #1 Отримання дочірніх областей видимості

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Приклад #2 Моніторинг стану дочірніх областей видимості

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

## Дивіться також

- [Scope::inherit](/uk/docs/reference/scope/inherit.html) — Створення дочірньої області видимості
- [Scope::setChildScopeExceptionHandler](/uk/docs/reference/scope/set-child-scope-exception-handler.html) — Обробник винятків для дочірніх областей видимості
