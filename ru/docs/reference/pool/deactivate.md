---
layout: docs
lang: ru
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /ru/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Принудительный перевод пула в состояние INACTIVE."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Принудительно переводит пул в состояние `INACTIVE`. В этом состоянии
пул отклоняет все запросы на получение ресурсов. Используется для
ручной деактивации при обнаружении проблем с внешним сервисом.

В отличие от `close()`, деактивация обратима --- пул можно вернуть
в рабочее состояние через `activate()` или `recover()`.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Деактивация при обнаружении проблемы

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// При обнаружении критической ошибки
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Сервис недоступен, пул деактивирован\n";
}
```

### Пример #2 Плановое обслуживание

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Пул деактивирован для обслуживания\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Обслуживание завершено, пул активирован\n";
}
```

## См. также

- [Pool::activate](/ru/docs/reference/pool/activate.html) — Перевести в состояние ACTIVE
- [Pool::recover](/ru/docs/reference/pool/recover.html) — Перевести в состояние RECOVERING
- [Pool::getState](/ru/docs/reference/pool/get-state.html) — Текущее состояние
- [Pool::close](/ru/docs/reference/pool/close.html) — Полное закрытие пула (необратимо)
