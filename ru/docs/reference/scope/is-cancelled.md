---
layout: docs
lang: ru
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /ru/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Проверяет, отменён ли scope."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Проверяет, был ли scope отменён. Scope помечается как отменённый после вызова `cancel()` или `dispose()`.

## Возвращаемое значение

`bool` — `true`, если scope был отменён, `false` в противном случае.

## Примеры

### Пример #1 Проверка отмены scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## См. также

- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отменить scope
- [Scope::isFinished](/ru/docs/reference/scope/is-finished.html) — Проверить, завершён ли scope
- [Scope::isClosed](/ru/docs/reference/scope/is-closed.html) — Проверить, закрыт ли scope
