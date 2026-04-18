---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "스레드 풀을 사용하여 배열의 각 항목에 callable을 병렬로 적용합니다."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

`$items`의 모든 요소에 대해 풀의 워커에 `$task($item)`을 동시에 제출한 후, 모든 작업이 완료될 때까지 호출 코루틴을 차단합니다. 워커가 완료되는 순서와 무관하게, 입력 배열과 동일한 순서로 결과를 반환합니다.

어떤 작업이 예외를 던지면, `map()`은 호출 코루틴에서 해당 예외를 다시 던집니다. 진행 중인 다른 작업은 취소되지 않습니다.

## 매개변수

| 매개변수 | 타입       | 설명                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | 입력 항목들. 각 요소는 `$task`의 첫 번째 인수로 전달됩니다.                                |
| `$task`   | `callable` | 각 항목에 적용할 callable. 워커 스레드에서 실행되며, `submit()`과 동일한 데이터 전송 규칙이 적용됩니다. |

## 반환값

`array` — `$items`와 동일한 순서로 각 입력 요소에 대한 `$task`의 결과.

## 예외

- `Async\ThreadPoolException` — 풀이 닫혔을 때.
- 어떤 작업이 던진 첫 번째 예외를 다시 던집니다.

## 예제

### 예제 #1 여러 파일의 줄 수를 병렬로 세기

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

### 예제 #2 병렬 수치 계산

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

## 참고

- [ThreadPool::submit()](/ko/docs/reference/thread-pool/submit.html) — 단일 작업 제출 후 Future 받기
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
