---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Застосувати callable до кожного елемента масиву паралельно, використовуючи пул потоків."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Надсилає `$task($item)` для кожного елемента `$items` до робочих потоків пулу конкурентно, а потім блокує викликаючу корутину до завершення всіх завдань. Повертає результати в тому ж порядку, що й вхідний масив, незалежно від порядку завершення робочими потоками.

Якщо будь-яке завдання кидає виняток, `map()` повторно кидає його у викликаючій корутині. Інші завдання, що виконуються, не скасовуються.

## Параметри

| Параметр  | Тип        | Опис                                                                                                                     |
|-----------|------------|--------------------------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | Вхідні елементи. Кожен елемент передається першим аргументом до `$task`.                                                |
| `$task`   | `callable` | Callable, що застосовується до кожного елемента. Виконується в робочому потоці; діють ті самі правила передачі даних, що й для `submit()`. |

## Значення, що повертається

`array` — результати `$task` для кожного вхідного елемента в тому ж порядку, що й `$items`.

## Винятки

- `Async\ThreadPoolException` — якщо пул закритий.
- Повторно кидає перший виняток, кинутий будь-яким завданням.

## Приклади

### Приклад #1 Підрахунок рядків у кількох файлах паралельно

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

### Приклад #2 Паралельні числові обчислення

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

## Дивіться також

- [ThreadPool::submit()](/uk/docs/reference/thread-pool/submit.html) — надіслати одне завдання та отримати Future
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
