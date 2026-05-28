---
layout: docs
lang: ru
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /ru/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — возвращает число CPU, доступных процессу. Учитывает cgroup-квоты, affinity и контейнерные лимиты."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` возвращает число CPU, доступных **текущему процессу**.

## Описание

```php
namespace Async;

function available_parallelism(): int
```

Учитывает cgroup CPU-квоты, `sched_setaffinity` и аналогичные ограничения. Это то значение, которое
рекомендует libuv для размера thread-pool / worker-pool. Всегда `>= 1`.

В контейнере с `cpu.max=2` функция вернёт `2`, а не физическое число ядер хоста. На bare-metal —
число логических ядер за вычетом ограничений affinity (если они выставлены).

Бэкенд: `uv_available_parallelism()` с fallback на `uv_cpu_info`.

## Возвращаемое значение

`int` — число CPU, гарантированно `>= 1`.

## Примеры

### Пример #1 Размер пула под доступные CPU

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Идиоматично: автодетект уже встроен в ThreadPool через workers=0,
// но явный вызов нужен, когда вы хотите масштабировать что-то другое.
$pool = new ThreadPool(workers: available_parallelism());
```

### Пример #2 Размер worker-pool HTTP-сервера

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\available_parallelism;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(available_parallelism())
);

$server->start();
```

### Пример #3 Диагностика окружения

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// В Docker с `--cpus=2` → 2
// На хосте с 16 ядрами без ограничений → 16
// В Kubernetes pod с requests/limits cpu=1 → 1
```

## Примечания

> **Совет:** для пулов воркеров `ThreadPool` и `HttpServer::setWorkers()` можно вообще не вызывать
> эту функцию руками — оба компонента используют `available_parallelism()` автоматически, если
> размер пула задан как `0`.

> На большинстве IO-bound нагрузок осмысленно оверкоммитить на `N + 1` или `N + 2` — за счёт
> того, что некоторые воркеры будут заблокированы в I/O.

## См. также

- [Async\\ThreadPool](/ru/docs/components/thread-pool.html) — где значение используется автоматически
- [Async\\cpu_usage()](/ru/docs/reference/cpu-usage.html) — текущая загрузка процесса и системы
- [Async\\loadavg()](/ru/docs/reference/loadavg.html) — средняя длина run-queue
