---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Получить уникальный идентификатор корутины."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Возвращает уникальный целочисленный идентификатор корутины. Идентификатор уникален в рамках текущего процесса PHP.

## Возвращаемое значение

`int` — уникальный идентификатор корутины.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "задача 1";
});

$coroutine2 = spawn(function() {
    return "задача 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Пример #2 Логирование с идентификатором

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Задача '$name' начата\n";
        \Async\delay(1000);
        echo "[coro:$id] Задача '$name' завершена\n";
    });
}
```

## См. также

- [Coroutine::getSpawnLocation](/ru/docs/reference/coroutine/get-spawn-location.html) — Место создания корутины
- [current_coroutine()](/ru/docs/reference/current-coroutine.html) — Получить текущую корутину
