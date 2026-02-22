---
layout: docs
lang: uk
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /uk/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Запускає корутину в зазначеній області видимості."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Запускає нову корутину в межах зазначеної області видимості. Корутина буде прив'язана до області видимості та керуватиметься її життєвим циклом: коли область скасовується або закривається, всі її корутини також будуть зачеплені.

## Параметри

`callable` — замикання, що буде виконане як корутина.

`params` — аргументи, що передаються замиканню.

## Значення, що повертається

`Coroutine` — об'єкт запущеної корутини.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Приклад #2 Передача параметрів

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... perform the request
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) — Глобальна функція для запуску корутин
- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування всіх корутин області видимості
- [Scope::awaitCompletion](/uk/docs/reference/scope/await-completion.html) — Очікування завершення корутин
