---
layout: docs
lang: ru
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /ru/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Возвращает массив дочерних scope."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Возвращает массив всех дочерних scope, созданных через `Scope::inherit()` от данного scope. Полезно для мониторинга и отладки иерархии scope.

## Возвращаемое значение

`array` — массив объектов `Scope`, являющихся дочерними для данного scope.

## Примеры

### Пример #1 Получение дочерних scope

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Пример #2 Мониторинг состояния дочерних scope

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
        $child->isCancelled() => 'отменён',
        $child->isFinished()  => 'завершён',
        $child->isClosed()    => 'закрыт',
        default               => 'активен',
    };
    echo "Scope: $status\n";
}
```

## См. также

- [Scope::inherit](/ru/docs/reference/scope/inherit.html) — Создать дочерний scope
- [Scope::setChildScopeExceptionHandler](/ru/docs/reference/scope/set-child-scope-exception-handler.html) — Обработчик ошибок дочерних scope
