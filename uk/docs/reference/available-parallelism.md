---
layout: docs
lang: uk
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /uk/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — повертає кількість CPU, доступних процесу. Враховує cgroup-квоти, affinity і контейнерні ліміти."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` повертає кількість CPU, доступних **поточному процесу**.

## Опис

```php
namespace Async;

function available_parallelism(): int
```

Враховує cgroup CPU-квоти, `sched_setaffinity` і аналогічні обмеження. Це те значення, яке
рекомендує libuv для розміру thread-pool / worker-pool. Завжди `>= 1`.

У контейнері з `cpu.max=2` функція поверне `2`, а не фізичне число ядер хоста. На bare-metal —
число логічних ядер за вирахуванням обмежень affinity (якщо вони виставлені).

Бекенд: `uv_available_parallelism()` з fallback на `uv_cpu_info`.

## Значення, що повертається

`int` — кількість CPU, гарантовано `>= 1`.

## Приклади

### Приклад #1 Розмір пулу під доступні CPU

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Ідіоматично: автодетект уже вбудований у ThreadPool через workers=0,
// але явний виклик потрібен, коли ви хочете масштабувати щось інше.
$pool = new ThreadPool(workers: available_parallelism());
```

### Приклад #2 Розмір worker-pool HTTP-сервера

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

### Приклад #3 Діагностика середовища

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// У Docker з `--cpus=2` → 2
// На хості з 16 ядрами без обмежень → 16
// У Kubernetes pod з requests/limits cpu=1 → 1
```

## Примітки

> **Порада:** для пулів воркерів `ThreadPool` і `HttpServer::setWorkers()` можна взагалі не викликати
> цю функцію руками — обидва компоненти використовують `available_parallelism()` автоматично, якщо
> розмір пулу заданий як `0`.

> На більшості IO-bound навантажень осмислено оверкомітити на `N + 1` або `N + 2` — за рахунок
> того, що деякі воркери будуть заблоковані в I/O.

## Див. також

- [Async\\ThreadPool](/uk/docs/components/thread-pool.html) — де значення використовується автоматично
- [Async\\cpu_usage()](/uk/docs/reference/cpu-usage.html) — поточне завантаження процесу і системи
- [Async\\loadavg()](/uk/docs/reference/loadavg.html) — середня довжина run-queue
