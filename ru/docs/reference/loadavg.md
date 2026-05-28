---
layout: docs
lang: ru
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /ru/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — load average 1/5/15 минут. POSIX, на Windows возвращает null."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` возвращает load average системы за последние 1, 5 и 15 минут, либо `null`, если
платформа не поддерживает load average (Windows).

## Описание

```php
namespace Async;

function loadavg(): ?array
```

Load average — средняя длина kernel run-queue. Это **другая метрика**, чем CPU utilisation:
на 4-ядерной машине устойчивый load 4.0 означает, что run-queue в среднем заполнен полностью.

## Возвращаемое значение

`array{0: float, 1: float, 2: float}` — `[1min, 5min, 15min]`. На Windows возвращает `null`.

## Примеры

### Пример #1 Базовое использование

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average недоступен на этой платформе\n";
}
```

### Пример #2 Алерт на перегруз

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

        // 5-минутный load выше числа доступных CPU = sustained перегрузка.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Примечания

> **Load average ≠ CPU usage.** Высокий load на машине с лёгким CPU usage обычно означает
> I/O-bound нагрузку (процессы стоят в `D`-state на disk/network). Для оценки CPU предпочитайте
> [`cpu_usage()`](/ru/docs/reference/cpu-usage.html).

> **Windows.** Концепта load average в Windows нет (это специфика BSD/Linux). Функция возвращает
> `null` — это намеренно, без эмуляции.

## См. также

- [Async\\cpu_usage()](/ru/docs/reference/cpu-usage.html) — текущая загрузка процесса и системы
- [Async\\available_parallelism()](/ru/docs/reference/available-parallelism.html) — число доступных CPU
- [Async\\CpuSnapshot](/ru/docs/reference/cpu-snapshot.html) — низкоуровневые CPU-счётчики
