---
layout: docs
lang: ru
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /ru/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — текущая загрузка процесса и системы с автоматическим расчётом дельты между вызовами. Удобно для телеметрии."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` возвращает загрузку CPU с момента предыдущего вызова, с уже посчитанными
процентами. Удобно для циклов телеметрии.

## Описание

```php
namespace Async;

function cpu_usage(): array
```

Функция держит **per-process** внутренний «предыдущий» снимок CPU-счётчиков. Первый вызов сохраняет
снимок и возвращает нули; каждый следующий вызов возвращает дельту от предыдущего снимка и
заменяет его.

## Возвращаемое значение

Ассоциативный массив:

| Ключ | Тип | Описание |
|------|-----|----------|
| `process_cores` | `float` | Усреднённое число занятых ядер процессом (`0..cpuCount`). Multi-core factor. |
| `process_percent` | `float` | Доля от общей машинной capacity, `0..100`. |
| `system_percent` | `float` | Общая утилизация CPU хоста, `0..100`. |
| `cpu_count` | `int` | Число логических CPU, видимых OS. |
| `interval_sec` | `float` | Wall-clock секунд между снимками. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load average 1/5/15 min или `null` на Windows. |

> Внутри контейнеров `system_percent` отражает **хост**, а не cgroup. Для per-process backpressure
> предпочитайте `process_cores` / `process_percent` — они корректно учитывают affinity и cgroup
> CPU throttling.

## Примеры

### Пример #1 Логирование загрузки раз в секунду

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // Первый вызов «прогревает» внутренний снимок и возвращает нули.
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

### Пример #2 Backpressure на основе загрузки процесса

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Не принимать новые задачи, пока процесс занимает > 90% от своей доли capacity.
    return $u['process_percent'] < 90.0;
}
```

### Пример #3 Health endpoint

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

## Примечания

> **Состояние глобальное на процесс.** Если вам нужны несколько независимых консумеров телеметрии
> (например, разные подсистемы считают свою дельту), берите снимки руками через
> [`CpuSnapshot::now()`](/ru/docs/reference/cpu-snapshot.html) и считайте дельту самостоятельно.

## См. также

- [Async\\CpuSnapshot](/ru/docs/reference/cpu-snapshot.html) — низкоуровневый снимок CPU-счётчиков
- [Async\\loadavg()](/ru/docs/reference/loadavg.html) — load average 1/5/15 минут
- [Async\\available_parallelism()](/ru/docs/reference/available-parallelism.html) — число доступных CPU
