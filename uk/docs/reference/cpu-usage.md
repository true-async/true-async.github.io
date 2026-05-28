---
layout: docs
lang: uk
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /uk/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — поточне завантаження процесу і системи з автоматичним обчисленням дельти між викликами. Зручно для телеметрії."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` повертає завантаження CPU з моменту попереднього виклику, з уже порахованими
відсотками. Зручно для циклів телеметрії.

## Опис

```php
namespace Async;

function cpu_usage(): array
```

Функція тримає **per-process** внутрішній «попередній» знімок CPU-лічильників. Перший виклик зберігає
знімок і повертає нулі; кожен наступний виклик повертає дельту від попереднього знімка і
замінює його.

## Значення, що повертається

Асоціативний масив:

| Ключ | Тип | Опис |
|------|-----|------|
| `process_cores` | `float` | Усереднена кількість зайнятих ядер процесом (`0..cpuCount`). Multi-core factor. |
| `process_percent` | `float` | Частка від загальної машинної capacity, `0..100`. |
| `system_percent` | `float` | Загальна утилізація CPU хоста, `0..100`. |
| `cpu_count` | `int` | Кількість логічних CPU, видимих OS. |
| `interval_sec` | `float` | Wall-clock секунд між знімками. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load average 1/5/15 хв або `null` на Windows. |

> Всередині контейнерів `system_percent` відображає **хост**, а не cgroup. Для per-process backpressure
> віддавайте перевагу `process_cores` / `process_percent` — вони коректно враховують affinity і cgroup
> CPU throttling.

## Приклади

### Приклад #1 Логування завантаження раз на секунду

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // Перший виклик «прогріває» внутрішній знімок і повертає нулі.
    cpu_usage();

    while (true) {
        delay(1000);
        $u = cpu_usage();
        printf(
            "[CPU] proc %.2f cores (%.1f%%), system %.1f%%, interval %.3fs\n",
            $u['process_cores'],
            $u['process_percent'],
            $u['system_percent'],
            $u['interval_sec'],
        );
    }
});
```

### Приклад #2 Backpressure на основі завантаження процесу

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Не приймати нові завдання, поки процес займає > 90% від своєї частки capacity.
    return $u['process_percent'] < 90.0;
}
```

### Приклад #3 Health endpoint

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\cpu_usage;
use function Async\loadavg;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/healthz') {
        $u = cpu_usage();
        $res->json([
            'cpu' => $u,
            'load' => loadavg(),
        ]);
        return;
    }
    $res->setStatusCode(404);
});

$server->start();
```

## Примітки

> **Стан глобальний на процес.** Якщо вам потрібні кілька незалежних споживачів телеметрії
> (наприклад, різні підсистеми рахують свою дельту), беріть знімки руками через
> [`CpuSnapshot::now()`](/uk/docs/reference/cpu-snapshot.html) і рахуйте дельту самостійно.

## Див. також

- [Async\\CpuSnapshot](/uk/docs/reference/cpu-snapshot.html) — низькорівневий знімок CPU-лічильників
- [Async\\loadavg()](/uk/docs/reference/loadavg.html) — load average 1/5/15 хвилин
- [Async\\available_parallelism()](/uk/docs/reference/available-parallelism.html) — кількість доступних CPU
