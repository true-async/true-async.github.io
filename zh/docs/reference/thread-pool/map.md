---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "使用线程池并行地对数组中的每个元素应用可调用对象。"
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

将 `$task($item)` 并发地提交给池中的工作线程处理 `$items` 的每个元素，然后阻塞调用协程直到所有任务完成。无论工作线程完成的顺序如何，结果按与输入数组相同的顺序返回。

如果任何任务抛出异常，`map()` 会在调用协程中重新抛出该异常。其他正在进行的任务不会被取消。

## 参数

| 参数      | 类型       | 说明                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | 输入元素。每个元素作为第一个参数传递给 `$task`。                                |
| `$task`   | `callable` | 应用于每个元素的可调用对象。在工作线程中执行；适用与 `submit()` 相同的数据传输规则。 |

## 返回值

`array` — 每个输入元素经 `$task` 处理后的结果，顺序与 `$items` 相同。

## 异常

- `Async\ThreadPoolException` — 如果池已关闭。
- 重新抛出任何任务抛出的第一个异常。

## 示例

### 示例 #1 并行统计多个文件的行数

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

### 示例 #2 并行数值计算

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

## 参见

- [ThreadPool::submit()](/zh/docs/reference/thread-pool/submit.html) — 提交单个任务并获取 Future
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
