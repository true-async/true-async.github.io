---
layout: docs
lang: ko
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /ko/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — 동시성 제어와 생성된 코루틴의 수명 주기 관리를 통한 배열 또는 Traversable의 동시 반복."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — 배열 또는 `Traversable`을 동시에 반복하며, 각 요소에 대해 `callback`을 호출합니다.

## 설명

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

`iterable`의 각 요소에 대해 별도의 코루틴에서 `callback`을 실행합니다.
`concurrency` 매개변수를 통해 동시에 실행되는 콜백의 수를 제한할 수 있습니다.
이 함수는 모든 반복이 완료될 때까지 현재 코루틴을 차단합니다.

`iterate()`를 통해 생성된 모든 코루틴은 격리된 자식 `Scope`에서 실행됩니다.

## 매개변수

**`iterable`**
배열 또는 `Traversable`을 구현하는 객체(제너레이터 및 `ArrayIterator` 포함)입니다.

**`callback`**
각 요소에 대해 호출되는 함수입니다. 두 개의 인수를 받습니다: `(mixed $value, mixed $key)`.
콜백이 `false`를 반환하면 반복이 중지됩니다.

**`concurrency`**
동시에 실행되는 콜백의 최대 수입니다. 기본값은 `0` — 기본 제한이며,
모든 요소가 동시에 처리됩니다. `1`은 단일 코루틴에서 실행을 의미합니다.

**`cancelPending`**
반복 완료 후 콜백 내부에서(`spawn()`을 통해) 생성된 자식 코루틴의 동작을 제어합니다.
- `true`(기본값) — 완료되지 않은 생성된 코루틴이 `AsyncCancellation`으로 취소됩니다.
- `false` — `iterate()`는 반환 전에 생성된 모든 코루틴이 완료되기를 기다립니다.

## 반환 값

이 함수는 값을 반환하지 않습니다.

## 오류/예외

- `Error` — 비동기 컨텍스트 외부 또는 스케줄러 컨텍스트에서 호출된 경우.
- `TypeError` — `iterable`이 배열이 아니고 `Traversable`을 구현하지 않는 경우.
- 콜백이 예외를 던지면 반복이 중지되고, 나머지 코루틴이 취소되며, 예외가 호출 코드로 전파됩니다.

## 예제

### 예제 #1 기본 배열 반복

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "모든 요청 완료\n";
});
?>
```

### 예제 #2 동시성 제한

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // 동시에 최대 10명의 사용자만 처리
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "User $userId loaded\n";
    }, concurrency: 10);

    echo "모든 사용자 처리 완료\n";
});
?>
```

### 예제 #3 조건에 의한 반복 중지

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Processing: $item\n";

        if ($item === 'cherry') {
            return false; // 반복 중지
        }
    });

    echo "반복 완료\n";
});
?>
```

**출력:**
```
Processing: apple
Processing: banana
Processing: cherry
반복 완료
```

### 예제 #4 제너레이터를 통한 반복

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: processing value $value\n";
    }, concurrency: 2);

    echo "모든 태스크 완료\n";
});
?>
```

### 예제 #5 생성된 코루틴 취소 (cancelPending = true)

기본적으로 콜백 내부에서 `spawn()`을 통해 생성된 코루틴은 반복 완료 후 취소됩니다:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // 백그라운드 태스크 생성
        spawn(function() use ($value) {
            try {
                echo "Background task $value started\n";
                suspend();
                suspend();
                echo "Background task $value finished\n"; // 실행되지 않음
            } catch (AsyncCancellation) {
                echo "Background task $value cancelled\n";
            }
        });
    });

    echo "반복 완료\n";
});
?>
```

**출력:**
```
Background task 1 started
Background task 2 started
Background task 3 started
Background task 1 cancelled
Background task 2 cancelled
Background task 3 cancelled
반복 완료
```

### 예제 #6 생성된 코루틴 대기 (cancelPending = false)

`cancelPending: false`를 전달하면 `iterate()`는 생성된 모든 코루틴이 완료되기를 기다립니다:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // 백그라운드 태스크 생성
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // 모든 백그라운드 태스크가 완료됨
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**출력:**
```
result-1, result-2, result-3
```

### 예제 #7 오류 처리

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error processing element $value");
            }
            echo "Processed: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Caught: " . $e->getMessage() . "\n";
    }
});
?>
```

## 참고

> **참고:** `iterate()`는 생성된 모든 코루틴을 위한 격리된 자식 Scope를 생성합니다.

> **참고:** 배열이 전달되면 `iterate()`는 반복 전에 배열의 복사본을 만듭니다.
> 콜백 내부에서 원본 배열을 수정해도 반복에 영향을 주지 않습니다.

> **참고:** `callback`이 `false`를 반환하면 반복이 중지되지만,
> 이미 실행 중인 코루틴은 완료될 때까지 계속됩니다(또는 `cancelPending = true`인 경우 취소됩니다).

## 변경 이력

| 버전   | 설명                           |
|--------|-------------------------------|
| 1.0.0  | `iterate()` 함수가 추가되었습니다. |

## 같이 보기

- [spawn()](/ko/docs/reference/spawn.html) - 코루틴 실행
- [await_all()](/ko/docs/reference/await-all.html) - 여러 코루틴 대기
- [Scope](/ko/docs/components/scope.html) - Scope 개념
- [Cancellation](/ko/docs/components/cancellation.html) - 코루틴 취소
