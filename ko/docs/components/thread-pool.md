---
layout: docs
lang: ko
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /ko/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — TrueAsync에서 병렬 CPU 바운드 작업 실행을 위한 워커 스레드 풀."
---

# Async\ThreadPool: 워커 스레드 풀

## ThreadPool이 필요한 이유

[`spawn_thread()`](/ko/docs/reference/spawn-thread.html)는 "하나의 작업 — 하나의 스레드" 문제를
해결합니다: 무거운 연산을 시작하고, 결과를 기다리고, 스레드가 종료됩니다. 이것은 편리하지만
비용이 따릅니다: **모든 스레드 시작은 전체 시스템 호출**입니다. 별도의 PHP 환경 초기화,
Opcache 바이트코드 로딩, 스택 할당 — 이 모든 것이 처음부터 일어납니다. 수백 또는 수천 개의
그러한 작업이 있을 때, 오버헤드가 눈에 띄게 됩니다.

`Async\ThreadPool`은 이 문제를 해결합니다: 시작 시 고정된 **워커 스레드** 집합
(자체 PHP 환경을 가진 OS 스레드)이 생성되어 프로그램의 전체 수명 동안 유지되며
작업을 실행하기 위해 **반복적으로 재사용**됩니다. 각 `submit()`은 작업을 큐에 넣고,
자유로운 워커가 이를 선택하여 실행하고, [`Async\Future`](/ko/docs/components/future.html)를
통해 결과를 반환합니다.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // 4명의 워커가 있는 풀에 8개의 작업 제출
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

여덟 개의 작업이 네 명의 워커에 걸쳐 병렬로 실행됩니다. 워커들이 연산하는 동안 — 메인
프로그램 (다른 코루틴)은 계속 실행됩니다: `await($f)`는 전체 프로세스가 아닌 대기 중인
코루틴만 일시 중단합니다.

## ThreadPool vs spawn_thread vs 코루틴: 언제 무엇을 사용할까

| 시나리오                                                 | 도구                     |
|----------------------------------------------------------|--------------------------|
| 드물게 시작되는 하나의 무거운 작업                       | `spawn_thread()`         |
| 루프에서 많은 짧은 CPU 작업                             | `ThreadPool`             |
| 전체 프로그램 동안 유지되는 고정 스레드                 | `ThreadPool`             |
| I/O: 네트워크, 데이터베이스, 파일시스템                 | 코루틴                   |
| 큐 없이 즉시 필요한 작업                                 | `spawn_thread()`         |

**핵심 규칙:** 작업이 많고 짧으면 — 풀이 스레드 시작 비용을 분할 상환합니다.
몇 초마다 한 번씩 시작하는 작업이 하나라면 — `spawn_thread()`로 충분합니다.

일반적인 풀 크기는 물리적 CPU 코어 수와 같습니다 (Linux의 `nproc`, C에서
`sysconf(_SC_NPROCESSORS_ONLN)`). 코어 수보다 많은 워커는 CPU 바운드 워크로드를 빠르게 하지
않으며 컨텍스트 스위칭 오버헤드만 추가합니다.

## 풀 생성

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| 파라미터     | 타입  | 목적                                                                 | 기본값            |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | 워커 스레드 수. 풀 생성 시 모두 시작됨                               | **필수**          |
| `$queueSize` | `int` | 대기 중인 작업 큐의 최대 길이                                        | `workers × 4`     |

모든 워커 스레드는 풀 **생성 즉시 시작됩니다** — `new ThreadPool(4)`는 즉시 네 개의 스레드를
생성합니다. 이것은 작은 "선불" 투자이지만, 이후 `submit()` 호출에는 스레드 시작 오버헤드가
없습니다.

`$queueSize`는 내부 작업 큐의 크기를 제한합니다. 큐가 가득 차면 (모든 워커가 바쁘고 큐에
이미 `$queueSize`개의 작업이 있을 때), 다음 `submit()`은 워커가 사용 가능해질 때까지 **호출
코루틴을 일시 중단**합니다. 값이 0이면 `workers × 4`를 의미합니다.

## 작업 제출

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

작업을 풀의 큐에 추가합니다. 다음과 같은 [`Async\Future`](/ko/docs/components/future.html)를
반환합니다:

- 워커가 실행을 완료하면 `$task`의 `return` 값으로 **이행(resolve)**됨;
- `$task`가 예외를 발생시키면 예외와 함께 **거부(reject)**됨.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // 인수 없는 작업
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // 인수가 있는 작업 — 인수도 값으로 전달됨 (깊은 복사)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### 작업에서 발생한 예외 처리

작업이 예외를 발생시키면, `Future`가 거부되고 `await()`이 호출 코루틴에서 이를 다시 발생시킵니다:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### 데이터 전달 규칙

작업 (`$task`)과 모든 `...$args`는 워커 스레드로 **깊은 복사**됩니다 — `spawn_thread()`와
동일한 규칙입니다. `stdClass`, PHP 참조 (`&$var`), 리소스는 전달할 수 없습니다; 시도하면
소스에서 `Async\ThreadTransferException`이 발생합니다. 자세한 내용:
[«스레드 간 데이터 전달»](/ko/docs/components/threads.html#스레드-간-데이터-전달).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

풀의 워커를 사용하여 `$items`의 각 요소에 `$task`를 병렬로 적용합니다. 모든 작업이 완료될
때까지 호출 코루틴을 **블록**합니다. 입력 데이터와 동일한 순서로 결과 배열을 반환합니다.

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

적어도 하나의 작업이 예외를 발생시키면, `map()`은 호출 코루틴에서 이를 다시 발생시킵니다.
결과 순서는 워커가 완료하는 순서에 관계없이 항상 입력 요소 순서와 일치합니다.

## 풀 상태 모니터링

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // 여러 작업 시작
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // 작업 시뮬레이션
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // 작업이 실행 중인 동안 카운터 확인
    delay(50); // 워커가 시작할 시간을 줌
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| 메서드                | 반환하는 것                                                                             |
|-----------------------|-----------------------------------------------------------------------------------------|
| `getWorkerCount()`    | 워커 스레드 수 (생성자에서 설정됨)                                                      |
| `getPendingCount()`   | 큐에 있는 작업, 아직 워커가 선택하지 않음                                               |
| `getRunningCount()`   | 현재 워커가 실행 중인 작업                                                              |
| `getCompletedCount()` | 풀 생성 이후 완료된 총 작업 수 (단조 증가)                                              |
| `isClosed()`          | `close()` 또는 `cancel()`을 통해 풀이 닫혔으면 `true`                                  |

카운터는 원자 변수로 구현되어 있습니다 — 워커가 병렬 스레드에서 실행 중인 경우에도 언제든지
정확합니다.

## 풀 종료

워커 스레드는 풀이 명시적으로 중지될 때까지 유지됩니다. 작업이 완료되면 항상 `close()`
또는 `cancel()`을 호출하세요 — 그렇지 않으면 스레드가 프로세스 종료 시까지 계속 실행됩니다.

### close() — 정상 종료

```php
$pool->close();
```

`close()` 호출 후:

- 새로운 `submit()` 호출은 즉시 `Async\ThreadPoolException`을 발생시킵니다.
- 큐에 이미 있거나 워커가 실행 중인 작업은 **정상적으로 완료됩니다**.
- 모든 진행 중인 작업이 완료되고 모든 워커가 중지된 후에만 메서드가 반환됩니다.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // 결과를 얻도록 보장됨

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — 강제 종료

```php
$pool->cancel();
```

`cancel()` 호출 후:

- 새로운 `submit()` 호출은 `Async\ThreadPoolException`을 발생시킵니다.
- 큐에 있는 작업 (아직 워커가 선택하지 않은)은 **즉시 거부됩니다** — 해당 `Future` 객체가
  "거부됨" 상태로 전환됩니다.
- 이미 워커가 실행 중인 작업은 현재 반복의 완료까지 **정상적으로 실행됩니다** (스레드 내부의
  PHP 코드를 강제로 중단하는 것은 불가능합니다).
- 워커는 현재 작업을 완료한 후 즉시 중지되고 새 작업을 선택하지 않습니다.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // 큐를 작업으로 채움
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // 즉시 취소 — 큐의 작업은 거부됨
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### close()와 cancel() 비교

| 측면                            | `close()`                          | `cancel()`                            |
|---------------------------------|------------------------------------|---------------------------------------|
| 새로운 submit() 호출            | `ThreadPoolException` 발생         | `ThreadPoolException` 발생            |
| 큐에 있는 작업                  | 정상적으로 실행됨                  | 즉시 거부됨                           |
| 현재 실행 중인 작업             | 정상적으로 완료됨                  | 정상적으로 완료됨 (현재 반복)         |
| 워커가 중지되는 시점            | 큐가 소진된 후                     | 현재 작업 완료 후                     |

## 스레드 간 풀 전달

`ThreadPool` 객체 자체는 스레드 안전합니다: `spawn_thread()`에 `use()`를 통해 전달할 수 있으며,
어느 스레드에서든 동일한 풀에서 `submit()`을 호출할 수 있습니다.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // 메인 스레드에서 풀을 한 번 생성
    $pool = new ThreadPool(workers: 4);

    // 풀도 사용할 OS 스레드 시작
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

이를 통해 여러 OS 스레드 또는 코루틴이 **단일 풀을 공유**하며 서로 독립적으로 작업을
제출하는 아키텍처가 가능합니다.

## 전체 예제: 병렬 이미지 처리

풀은 한 번 생성됩니다. 각 워커는 파일 경로를 받아 GD를 통해 이미지를 열고,
지정된 크기로 축소하고, 그레이스케일로 변환하고, 출력 디렉토리에 저장합니다.
메인 스레드는 준비되는 대로 결과를 수집합니다.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// 이 함수는 워커 스레드에서 실행됩니다.
// GD 작업은 CPU 바운드 — 정확히 스레드의 이점을 활용하는 종류의 작업입니다.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // 소스 열기
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // 종횡비를 유지하면서 크기 조정
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // 그레이스케일로 변환
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // 출력 디렉토리에 저장
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // 처리할 파일 목록
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map()은 순서를 보존 — results[i]는 files[i]에 해당
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## 참조

- [`spawn_thread()`](/ko/docs/reference/spawn-thread.html) — 별도의 스레드에서 단일 작업 시작
- [`Async\Thread`](/ko/docs/components/threads.html) — OS 스레드 및 데이터 전달 규칙
- [`Async\ThreadChannel`](/ko/docs/components/thread-channels.html) — 스레드 안전 채널
- [`Async\Future`](/ko/docs/components/future.html) — 작업 결과 기다리기
