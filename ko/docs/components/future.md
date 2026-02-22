---
layout: docs
lang: ko
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /ko/docs/components/future.html
page_title: "Future"
description: "TrueAsync의 Future -- 결과의 약속, map/catch/finally 변환 체인, FutureState 및 진단."
---

# Future: 결과의 약속

## Future란

`Async\Future`는 아직 준비되지 않았을 수 있는 작업의 결과를 나타내는 객체입니다.
Future를 사용하면:

- `await()` 또는 `$future->await()`를 통해 결과를 기다릴 수 있습니다
- `map()`, `catch()`, `finally()`를 통해 변환 체인을 구축할 수 있습니다
- `cancel()`을 통해 작업을 취소할 수 있습니다
- 정적 팩토리를 통해 이미 완료된 Future를 생성할 수 있습니다

Future는 JavaScript의 `Promise`와 유사하지만 TrueAsync 코루틴과 통합되어 있습니다.

## Future와 FutureState

Future는 명확한 관심사 분리를 가진 두 클래스로 나뉩니다:

- **`FutureState`** -- 결과가 기록되는 가변 컨테이너
- **`Future`** -- 결과를 읽고 변환하는 읽기 전용 래퍼

```php
<?php
use Async\Future;
use Async\FutureState;

// FutureState 생성 -- 상태를 소유합니다
$state = new FutureState();

// Future 생성 -- 결과에 대한 접근을 제공합니다
$future = new Future($state);

// $future를 소비자에게 전달
// $state를 생산자에게 전달

// 생산자가 작업을 완료합니다
$state->complete(42);

// 소비자가 결과를 가져옵니다
$result = $future->await(); // 42
?>
```

이 분리는 소비자가 실수로 Future를 완료할 수 없도록 보장합니다 -- `FutureState`의 보유자만 그 권한을 가집니다.

## Future 생성

### FutureState를 통해

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// 다른 코루틴에서 완료
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### 정적 팩토리

이미 완료된 Future를 생성하기 위해:

```php
<?php
use Async\Future;

// 성공적으로 완료된 Future
$future = Future::completed(42);
$result = $future->await(); // 42

// 오류가 있는 Future
$future = Future::failed(new \RuntimeException('Something went wrong'));
$result = $future->await(); // RuntimeException 발생
?>
```

## 변환 체인

Future는 JavaScript의 Promise와 유사하게 작동하는 세 가지 변환 메서드를 지원합니다:

### map() -- 결과 변환

성공적으로 완료된 경우에만 호출됩니다. 변환된 결과를 가진 새 Future를 반환합니다:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Result: $value");

$state->complete(21);

echo $asString->await(); // "Result: 42"
?>
```

### catch() -- 오류 처리

오류 시에만 호출됩니다. 예외에서 복구할 수 있습니다:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Default value';
});

$state->error(new \RuntimeException('Error'));

echo $safe->await(); // "Default value"
?>
```

### finally() -- 모든 결과에서 실행

성공과 오류 모두에서 항상 호출됩니다. 부모 Future의 결과가 자식에게 변경 없이 전달됩니다:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // 리소스 해제
    echo "Operation completed\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (결과가 변경 없이 전달됨)
?>
```

### 복합 체인

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Unknown')
    ->catch(fn(\Throwable $e) => 'Error: ' . $e->getMessage())
    ->finally(function($value) {
        // 로깅
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### 독립적인 구독자

동일한 Future에 대한 각 `map()` 호출은 **독립적인** 체인을 생성합니다. 구독자들은 서로 영향을 미치지 않습니다:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// 동일한 Future에서 두 개의 독립적인 체인
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### 체인에서의 오류 전파

소스 Future가 오류로 완료되면, `map()`은 **건너뛰고** 오류가 `catch()`에 직접 전달됩니다:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "This code won't execute\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recovered: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Source error'));

echo await($result) . "\n"; // "Recovered: Source error"
?>
```

`map()` **내부**에서 예외가 발생하면 후속 `catch()`에 의해 잡힙니다:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Error in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Caught: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Caught: Error in map"
?>
```

## 결과 대기

### await() 함수를 통해

```php
<?php
use function Async\await;

$result = await($future);
```

### $future->await() 메서드를 통해

```php
<?php
$result = $future->await();

// 취소 타임아웃 포함
$result = $future->await(Async\timeout(5000));
```

## Future 취소

```php
<?php
use Async\AsyncCancellation;

// 기본 메시지로 취소
$future->cancel();

// 사용자 정의 오류로 취소
$future->cancel(new AsyncCancellation('Operation is no longer needed'));
```

## 경고 억제: ignore()

Future가 사용되지 않으면(`await()`, `map()`, `catch()`, `finally()` 중 아무것도 호출되지 않은 경우) TrueAsync가 경고를 발생시킵니다.
이 경고를 명시적으로 억제하려면:

```php
<?php
$future->ignore();
```

또한 Future가 오류로 완료되었는데 해당 오류가 처리되지 않은 경우, TrueAsync가 이에 대해 경고합니다. `ignore()`는 이 경고도 억제합니다.

## FutureState: 작업 완료

### complete() -- 성공적인 완료

```php
<?php
$state->complete($result);
```

### error() -- 오류로 완료

```php
<?php
$state->error(new \RuntimeException('Error'));
```

### 제약 사항

- `complete()`와 `error()`는 **한 번만** 호출할 수 있습니다. 반복 호출은 `AsyncException`을 발생시킵니다.
- `complete()` 또는 `error()` 호출 후 Future의 상태는 불변입니다.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## 진단

두 클래스(`Future`와 `FutureState`) 모두 진단 메서드를 제공합니다:

```php
<?php
// 상태 확인
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Future가 생성된 위치
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Future가 완료된 위치
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" or "unknown"

// 대기 정보
$future->getAwaitingInfo(); // array
```

## 실용적인 예제: HTTP 클라이언트

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// 사용법
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## 참고

- [await()](/ko/docs/reference/await.html) -- 완료 대기
- [코루틴](/ko/docs/components/coroutines.html) -- 동시성의 기본 단위
- [취소](/ko/docs/components/cancellation.html) -- 취소 메커니즘
