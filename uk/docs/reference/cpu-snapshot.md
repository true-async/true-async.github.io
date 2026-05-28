---
layout: docs
lang: uk
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /uk/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — імутабельний знімок CPU-лічильників процесу і системи. Низькорівневе джерело для власних дельта-розрахунків."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` — імутабельний point-in-time знімок CPU-лічильників процесу і системи.

## Коли використовувати

Високорівнева обгортка [`Async\cpu_usage()`](/uk/docs/reference/cpu-usage.html) тримає один
внутрішній знімок на процес і рахує дельту автоматично. Цього достатньо для більшості
телеметричних задач.

`CpuSnapshot` потрібен тоді, коли:

- кілька незалежних споживачів телеметрії хочуть рахувати свої дельти незалежно;
- треба зберегти саме «сирі» лічильники (для логу, дампу, передачі в іншу систему);
- хочеться обчислювати не лише process/system, а власні похідні метрики.

## Огляд класу

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

Усі time-valued поля — монотонно зростаючі наносекундні лічильники з implementation-defined початком
відліку. **Одиничне значення не несе сенсу** — рахуйте дельту між двома знімками, узятими
в різні моменти часу.

Крос-платформно: однакові поля і семантика на Linux і Windows.

## Поля

| Поле | Тип | Опис |
|------|-----|------|
| `wallNs` | `int` | Монотонний wall-clock час у момент захоплення. |
| `processUserNs` | `int` | Сумарний user-mode CPU-час усіх потоків процесу. |
| `processSystemNs` | `int` | Сумарний kernel-mode CPU-час усіх потоків процесу. |
| `systemIdleNs` | `int` | Сумарний idle-час по всіх логічних CPU хоста. |
| `systemBusyNs` | `int` | Сумарний non-idle час по всіх логічних CPU хоста (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Кількість логічних CPU, видимих OS у момент захоплення. |

> **Усередині контейнерів** `systemIdleNs` / `systemBusyNs` відображають **хост**, а не cgroup. Для
> per-process backpressure віддавайте перевагу `process*`-полям — вони автоматично враховують affinity і
> cgroup CPU throttling.

## Методи

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Робить свіжий знімок.

## Приклади

### Приклад #1 Ручний розрахунок дельти

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

    // Скільки ядер зайняли user + kernel час за інтервал.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Процес зайняв у середньому %.3f ядра за останню секунду\n",
        $processCores
    );
});
```

### Приклад #2 Два незалежних споживачі

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

// Два екземпляри — дві незалежні серії вимірювань.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Примітки

> Клас **імутабельний** і **не серіалізується** (`@strict-properties`, `@not-serializable`).
> Конструктор приватний — екземпляр створюється лише через `CpuSnapshot::now()`.

## Див. також

- [Async\\cpu_usage()](/uk/docs/reference/cpu-usage.html) — готова дельта з уже порахованими відсотками
- [Async\\loadavg()](/uk/docs/reference/loadavg.html) — load average 1/5/15 хвилин
- [Async\\available_parallelism()](/uk/docs/reference/available-parallelism.html) — кількість доступних CPU
