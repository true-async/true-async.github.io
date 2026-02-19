---
layout: docs
lang: ru
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /ru/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Обработка ошибки Future."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Регистрирует обработчик ошибки для `Future`. Callback вызывается, если Future завершился с исключением. Если callback возвращает значение, оно становится результатом нового Future. Если callback выбрасывает исключение, новый Future завершается с этой ошибкой.

## Параметры

`catch` — функция обработки ошибки. Принимает `Throwable`, может возвращать значение для восстановления. Сигнатура: `function(\Throwable $e): mixed`.

## Возвращаемое значение

`Future` — новый Future с результатом обработки ошибки или с исходным значением, если ошибки не было.

## Примеры

### Пример #1 Обработка ошибки с восстановлением

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Сервис недоступен"))
    ->catch(function(\Throwable $e) {
        echo "Ошибка: " . $e->getMessage() . "\n";
        return "значение по умолчанию"; // Восстановление
    });

$result = $future->await();
echo $result; // значение по умолчанию
```

### Пример #2 Перехват ошибок при асинхронной операции

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP ошибка: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Логируем ошибку и возвращаем пустой массив
    error_log("API ошибка: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Найдено пользователей: $count\n";
```

## См. также

- [Future::map](/ru/docs/reference/future/map.html) — Трансформация результата Future
- [Future::finally](/ru/docs/reference/future/finally.html) — Callback при завершении Future
- [Future::ignore](/ru/docs/reference/future/ignore.html) — Игнорировать необработанные ошибки
