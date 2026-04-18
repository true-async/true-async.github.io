---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Применить callable к каждому элементу массива параллельно с использованием пула потоков."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Параллельно отправляет `$task($item)` для каждого элемента `$items` рабочим потокам пула, затем блокирует вызывающую корутину до завершения всех задач. Возвращает результаты в том же порядке, что и входной массив, независимо от порядка завершения работ.

Если любая задача выбрасывает исключение, `map()` повторно выбрасывает его в вызывающей корутине. Остальные выполняющиеся задачи при этом не отменяются.

## Параметры

| Параметр | Тип        | Описание                                                                                                           |
|----------|------------|--------------------------------------------------------------------------------------------------------------------|
| `$items` | `array`    | Входные элементы. Каждый элемент передаётся первым аргументом в `$task`.                                           |
| `$task`  | `callable` | Callable, применяемый к каждому элементу. Выполняется в рабочем потоке; применяются те же правила передачи данных, что и в `submit()`. |

## Возвращаемое значение

`array` — результаты применения `$task` к каждому входному элементу, в том же порядке, что и `$items`.

## Исключения

- `Async\ThreadPoolException` — если пул был закрыт.
- Повторно выбрасывает первое исключение, брошенное любой задачей.

## Примеры

### Пример #1 Параллельный подсчёт строк в нескольких файлах

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

### Пример #2 Параллельные вычисления

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $inputs = [1_000_000, 2_000_000, 3_000_000, 4_000_000];

    $results = $pool->map($inputs, function(int $n) {
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    foreach ($inputs as $i => $n) {
        echo "$n iterations → {$results[$i]}\n";
    }

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::submit()](/ru/docs/reference/thread-pool/submit.html) — отправить одну задачу и получить Future
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
