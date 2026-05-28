---
layout: docs
lang: uk
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /uk/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — load average 1/5/15 хвилин. POSIX, на Windows повертає null."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` повертає load average системи за останні 1, 5 і 15 хвилин, або `null`, якщо
платформа не підтримує load average (Windows).

## Опис

```php
namespace Async;

function loadavg(): ?array
```

Load average — середня довжина kernel run-queue. Це **інша метрика**, ніж CPU utilisation:
на 4-ядерній машині сталий load 4.0 означає, що run-queue в середньому заповнена повністю.

## Значення, що повертається

`array{0: float, 1: float, 2: float}` — `[1min, 5min, 15min]`. На Windows повертає `null`.

## Приклади

### Приклад #1 Базове використання

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average недоступний на цій платформі\n";
}
```

### Приклад #2 Алерт на перевантаження

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\loadavg;
use function Async\available_parallelism;

spawn(function () {
    $cpu = available_parallelism();
    while (true) {
        delay(60_000);
        $load = loadavg();
        if ($load === null) continue;

        // 5-хвилинний load вище за число доступних CPU = sustained перевантаження.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Примітки

> **Load average ≠ CPU usage.** Високий load на машині з легким CPU usage зазвичай означає
> I/O-bound навантаження (процеси стоять у `D`-state на disk/network). Для оцінки CPU віддавайте
> перевагу [`cpu_usage()`](/uk/docs/reference/cpu-usage.html).

> **Windows.** Концепту load average у Windows немає (це специфіка BSD/Linux). Функція повертає
> `null` — це навмисно, без емуляції.

## Див. також

- [Async\\cpu_usage()](/uk/docs/reference/cpu-usage.html) — поточне завантаження процесу і системи
- [Async\\available_parallelism()](/uk/docs/reference/available-parallelism.html) — кількість доступних CPU
- [Async\\CpuSnapshot](/uk/docs/reference/cpu-snapshot.html) — низькорівневі CPU-лічильники
