---
layout: docs
lang: ru
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /ru/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Создаёт новый Scope, наследующий от указанного или текущего."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Создаёт новый `Scope`, наследующий от указанного родительского scope. Если параметр `$parentScope` не указан (или равен `null`), новый scope наследует от текущего активного scope.

Дочерний scope наследует обработчики исключений и политики отмены от родительского.

## Параметры

`parentScope` — родительский scope, от которого будет наследоваться новый. Если `null`, используется текущий активный scope.

## Возвращаемое значение

`Scope` — новый дочерний scope.

## Примеры

### Пример #1 Создание дочернего scope от текущего

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Внутри корутины текущий scope — это $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Работаю в дочернем scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Пример #2 Явное указание родительского scope

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Корутина в дочернем scope\n";
});

// Отмена родителя отменяет и дочерний scope
$rootScope->cancel();
```

## См. также

- [Scope::\_\_construct](/ru/docs/reference/scope/construct.html) — Создать корневой Scope
- [Scope::getChildScopes](/ru/docs/reference/scope/get-child-scopes.html) — Получить дочерние scope
- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Отменить и закрыть scope
