---
layout: docs
lang: ru
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /ru/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Регистрирует колбэк, вызываемый при завершении scope."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Регистрирует функцию обратного вызова, которая будет выполнена при завершении scope. Это аналог блока `finally` для scope, гарантирующий выполнение кода очистки вне зависимости от того, как scope завершился (нормально, с отменой или ошибкой).

## Параметры

`callback` — замыкание, которое будет вызвано при завершении scope.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Очистка ресурсов

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope завершён, очистка ресурсов\n";
    // Закрытие соединений, удаление временных файлов
});

$scope->spawn(function() {
    echo "Выполнение задачи\n";
});

$scope->awaitCompletion();
// Вывод: "Выполнение задачи"
// Вывод: "Scope завершён, очистка ресурсов"
```

### Пример #2 Несколько колбэков

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Закрытие соединения с БД\n";
});

$scope->finally(function() {
    echo "Запись метрик\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Оба колбэка будут вызваны при завершении scope
```

## См. также

- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Закрыть scope
- [Scope::isFinished](/ru/docs/reference/scope/is-finished.html) — Проверить, завершён ли scope
- [Coroutine::finally](/ru/docs/reference/coroutine/on-finally.html) — Колбэк при завершении корутины
