---
layout: docs
lang: ru
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /ru/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Проверяет, завершён ли scope."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Проверяет, завершены ли все корутины в scope. Scope считается завершённым, когда все его корутины (включая дочерние scope) завершили выполнение.

## Возвращаемое значение

`bool` — `true`, если все корутины scope завершены, `false` в противном случае.

## Примеры

### Пример #1 Проверка завершения scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## См. также

- [Scope::isClosed](/ru/docs/reference/scope/is-closed.html) — Проверить, закрыт ли scope
- [Scope::isCancelled](/ru/docs/reference/scope/is-cancelled.html) — Проверить, отменён ли scope
- [Scope::awaitCompletion](/ru/docs/reference/scope/await-completion.html) — Ожидание завершения корутин
