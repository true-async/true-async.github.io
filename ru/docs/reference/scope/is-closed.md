---
layout: docs
lang: ru
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Проверяет, закрыт ли scope."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Проверяет, закрыт ли scope. Scope считается закрытым после вызова `dispose()` или `disposeSafely()`. В закрытый scope нельзя добавлять новые корутины.

## Возвращаемое значение

`bool` — `true`, если scope закрыт, `false` в противном случае.

## Примеры

### Пример #1 Проверка состояния scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Пример #2 Защита от добавления в закрытый scope

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "Эта корутина не будет создана\n";
    });
} else {
    echo "Scope уже закрыт\n";
}
```

## См. также

- [Scope::isFinished](/ru/docs/reference/scope/is-finished.html) — Проверить, завершён ли scope
- [Scope::isCancelled](/ru/docs/reference/scope/is-cancelled.html) — Проверить, отменён ли scope
- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Закрыть scope
