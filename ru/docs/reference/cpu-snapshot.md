---
layout: docs
lang: ru
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /ru/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — иммутабельный снимок CPU-счётчиков процесса и системы. Низкоуровневый источник для собственных дельта-расчётов."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` — иммутабельный point-in-time снимок CPU-счётчиков процесса и системы.

## Когда использовать

Высокоуровневая обёртка [`Async\cpu_usage()`](/ru/docs/reference/cpu-usage.html) держит один
внутренний снимок на процесс и считает дельту автоматически. Этого достаточно для большинства
телеметрических задач.

`CpuSnapshot` нужен тогда, когда:

- несколько независимых консумеров телеметрии хотят считать свои дельты независимо;
- нужно сохранить именно «сырые» счётчики (для лога, дампа, передачи в другую систему);
- хочется вычислять не только process/system, а собственные производные метрики.

## Обзор класса

```php
namespace Async;

final class CpuSnapshot
{
    public readonly int $wallNs;
    public readonly int $processUserNs;
    public readonly int $processSystemNs;
    public readonly int $systemIdleNs;
    public readonly int $systemBusyNs;
    public readonly int $cpuCount;

    public static function now(): CpuSnapshot;
}
```

Все time-valued поля — монотонно растущие наносекундные счётчики с implementation-defined началом
отсчёта. **Одиночное значение не несёт смысла** — считайте дельту между двумя снимками, взятыми
в разные моменты времени.

Кросс-платформенно: одинаковые поля и семантика на Linux и Windows.

## Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `wallNs` | `int` | Монотонное wall-clock время в момент захвата. |
| `processUserNs` | `int` | Суммарное user-mode CPU-время всех потоков процесса. |
| `processSystemNs` | `int` | Суммарное kernel-mode CPU-время всех потоков процесса. |
| `systemIdleNs` | `int` | Суммарное idle-время по всем логическим CPU хоста. |
| `systemBusyNs` | `int` | Суммарное non-idle время по всем логическим CPU хоста (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Число логических CPU, видимых OS в момент захвата. |

> **Внутри контейнеров** `systemIdleNs` / `systemBusyNs` отражают **хост**, а не cgroup. Для
> per-process backpressure предпочитайте `process*`-поля — они автоматически учитывают affinity и
> cgroup CPU throttling.

## Методы

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Делает свежий снимок.

## Примеры

### Пример #1 Ручной расчёт дельты

```php
<?php
use Async\CpuSnapshot;
use function Async\spawn;
use function Async\delay;

spawn(function () {
    $prev = CpuSnapshot::now();
    delay(1000);
    $now = CpuSnapshot::now();

    $wall = $now->wallNs  - $prev->wallNs;
    $user = $now->processUserNs   - $prev->processUserNs;
    $sys  = $now->processSystemNs - $prev->processSystemNs;

    // Сколько ядер заняли user + kernel время за интервал.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Процесс занял в среднем %.3f ядра за последнюю секунду\n",
        $processCores
    );
});
```

### Пример #2 Два независимых консумера

```php
<?php
use Async\CpuSnapshot;

class TelemetryReporter
{
    private ?CpuSnapshot $prev = null;

    public function tick(): array
    {
        $now = CpuSnapshot::now();
        if ($this->prev === null) {
            $this->prev = $now;
            return ['process_cores' => 0.0];
        }

        $wall = $now->wallNs - $this->prev->wallNs;
        $cpu  = ($now->processUserNs   - $this->prev->processUserNs)
              + ($now->processSystemNs - $this->prev->processSystemNs);

        $this->prev = $now;
        return ['process_cores' => $wall > 0 ? $cpu / $wall : 0.0];
    }
}

// Два экземпляра — две независимые серии измерений.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Примечания

> Класс **иммутабельный** и **не сериализуется** (`@strict-properties`, `@not-serializable`).
> Конструктор приватный — экземпляр создаётся только через `CpuSnapshot::now()`.

## См. также

- [Async\\cpu_usage()](/ru/docs/reference/cpu-usage.html) — готовая дельта с уже посчитанными процентами
- [Async\\loadavg()](/ru/docs/reference/loadavg.html) — load average 1/5/15 минут
- [Async\\available_parallelism()](/ru/docs/reference/available-parallelism.html) — число доступных CPU
