---
layout: docs
lang: ko
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /ko/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "Async\\Coroutine 클래스 -- 생성, 수명 주기, 상태, 취소, 디버깅 및 완전한 메서드 참조."
---

# Async\Coroutine 클래스

(PHP 8.6+, True Async 1.0)

## TrueAsync의 코루틴

일반 함수가 `fread`나 `fwrite` 같은 I/O 작업(파일 읽기 또는 네트워크 요청)을 호출하면,
제어가 운영 체제 커널로 전달되고 작업이 완료될 때까지 `PHP`가 차단됩니다.

그러나 코루틴 내에서 함수가 실행되고 I/O 작업을 호출하면,
전체 `PHP` 프로세스가 아닌 코루틴만 차단됩니다.
그동안 다른 코루틴이 있다면 제어가 전달됩니다.

이런 의미에서 코루틴은 운영 체제 스레드와 매우 유사하지만,
OS 커널이 아닌 사용자 공간에서 관리됩니다.

또 다른 중요한 차이점은 코루틴은 CPU 시간을 번갈아 사용하며
자발적으로 제어를 양보하는 반면, 스레드는 언제든지 선점될 수 있다는 것입니다.

TrueAsync 코루틴은 단일 스레드 내에서 실행되며
병렬이 아닙니다. 이는 몇 가지 중요한 결과를 초래합니다:
- 변수를 동시에 실행하지 않으므로 잠금 없이 다른 코루틴에서 자유롭게 읽고 수정할 수 있습니다.
- 코루틴은 여러 CPU 코어를 동시에 사용할 수 없습니다.
- 하나의 코루틴이 긴 동기 작업을 수행하면 다른 코루틴에 제어를 양보하지 않으므로 전체 프로세스가 차단됩니다.

## 코루틴 생성

코루틴은 `spawn()` 함수를 사용하여 생성합니다:

```php
use function Async\spawn;

// 코루틴 생성
$coroutine = spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

// $coroutine은 Async\Coroutine 타입의 객체입니다
// 코루틴은 이미 실행 예약되어 있습니다
```

`spawn`이 호출되면 함수는 스케줄러에 의해 가능한 빨리 비동기적으로 실행됩니다.

## 매개변수 전달

`spawn` 함수는 `callable`과 해당 함수가 시작될 때 전달될 모든 매개변수를 받습니다.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// 함수와 매개변수 전달
$coroutine = spawn(fetchUser(...), 123);
```

## 결과 가져오기

코루틴의 결과를 얻으려면 `await()`를 사용합니다:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Done!";
});

echo "Coroutine started\n";

// 결과 대기
$result = await($coroutine);

echo "Result: $result\n";
```

**중요:** `await()`는 **현재 코루틴**의 실행을 차단하지만, 전체 `PHP` 프로세스를 차단하지는 않습니다.
다른 코루틴은 계속 실행됩니다.

## 코루틴 수명 주기

코루틴은 여러 상태를 거칩니다:

1. **대기 중(Queued)** -- `spawn()`으로 생성됨, 스케줄러에 의해 시작 대기 중
2. **실행 중(Running)** -- 현재 실행 중
3. **일시 중단(Suspended)** -- 일시 정지, I/O 또는 `suspend()` 대기 중
4. **완료(Completed)** -- 실행 완료 (결과 또는 예외와 함께)
5. **취소됨(Cancelled)** -- `cancel()`로 취소됨

### 상태 확인

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - 시작 대기 중
var_dump($coro->isStarted());   // false - 아직 시작되지 않음

suspend(); // 코루틴이 시작되도록 함

var_dump($coro->isStarted());    // true - 코루틴이 시작됨
var_dump($coro->isRunning());    // false - 현재 실행 중이 아님
var_dump($coro->isSuspended());  // true - 일시 중단, 무언가를 기다리는 중
var_dump($coro->isCompleted());  // false - 아직 완료되지 않음
var_dump($coro->isCancelled());  // false - 취소되지 않음
```

## 일시 중단: suspend

`suspend` 키워드는 코루틴을 멈추고 제어를 스케줄러에 전달합니다:

```php
spawn(function() {
    echo "Before suspend\n";

    suspend(); // 여기서 멈춤

    echo "After suspend\n";
});

echo "Main code\n";

// 출력:
// Before suspend
// Main code
// After suspend
```

코루틴이 `suspend`에서 멈추고, 제어가 메인 코드로 돌아갔습니다. 나중에 스케줄러가 코루틴을 재개했습니다.

### 대기와 함께 suspend

일반적으로 `suspend`는 어떤 이벤트를 기다리는 데 사용됩니다:

```php
spawn(function() {
    echo "Making an HTTP request\n";

    $data = file_get_contents('https://api.example.com/data');
    // file_get_contents 내부에서 suspend가 암시적으로 호출됩니다
    // 네트워크 요청이 진행되는 동안 코루틴은 일시 중단됩니다

    echo "Got data: $data\n";
});
```

PHP는 I/O 작업에서 자동으로 코루틴을 일시 중단합니다. 수동으로 `suspend`를 작성할 필요가 없습니다.

## 코루틴 취소

```php
$coro = spawn(function() {
    try {
        echo "Starting long work\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // 100ms 대기
            echo "Iteration $i\n";
        }

        echo "Finished\n";
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled during iteration\n";
    }
});

// 코루틴이 1초간 작업하도록 함
Async\sleep(1000);

// 취소
$coro->cancel();

// 코루틴은 다음 await/suspend에서 AsyncCancellation을 받습니다
```

**중요:** 취소는 협력적으로 작동합니다. 코루틴은 (`await`, `sleep` 또는 `suspend`를 통해) 취소를 확인해야 합니다. 코루틴을 강제로 종료할 수 없습니다.

## 다중 코루틴

원하는 만큼 시작할 수 있습니다:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// 모든 코루틴 대기
$results = array_map(fn($t) => await($t), $tasks);

echo "Loaded " . count($results) . " results\n";
```

10개의 요청이 모두 동시에 실행됩니다. 10초(각각 1초) 대신 약 1초 만에 완료됩니다.

## 오류 처리

코루틴의 오류는 일반 `try-catch`로 처리됩니다:

```php
$coro = spawn(function() {
    throw new Exception("Oops!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Caught error: " . $e->getMessage() . "\n";
}
```

오류가 잡히지 않으면 상위 스코프로 전파됩니다:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Error in coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Error bubbled up to scope: " . $e->getMessage() . "\n";
}
```

## 코루틴 = 객체

코루틴은 완전한 PHP 객체입니다. 어디에든 전달할 수 있습니다:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // 긴 작업
        Async\sleep(10000);
        return "Result";
    });
}

$task = startBackgroundTask();

// 다른 함수에 전달
processTask($task);

// 또는 배열에 저장
$tasks[] = $task;

// 또는 객체 속성에 저장
$this->backgroundTask = $task;
```

## 중첩 코루틴

코루틴은 다른 코루틴을 실행할 수 있습니다:

```php
spawn(function() {
    echo "Parent coroutine\n";

    $child1 = spawn(function() {
        echo "Child coroutine 1\n";
        return "Result 1";
    });

    $child2 = spawn(function() {
        echo "Child coroutine 2\n";
        return "Result 2";
    });

    // 두 자식 코루틴 대기
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Parent received: $result1 and $result2\n";
});
```

## Finally: 보장된 정리

코루틴이 취소되더라도 `finally`는 실행됩니다:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // 여기서 취소될 수 있음
        }
    } finally {
        // 어떤 경우에도 파일이 닫힙니다
        fclose($file);
        echo "File closed\n";
    }
});
```

## 코루틴 디버깅

### 콜 스택 가져오기

```php
$coro = spawn(function() {
    doSomething();
});

// 코루틴의 콜 스택 가져오기
$trace = $coro->getTrace();
print_r($trace);
```

### 코루틴이 생성된 위치 확인

```php
$coro = spawn(someFunction(...));

// spawn()이 호출된 위치
echo "Coroutine created at: " . $coro->getSpawnLocation() . "\n";
// 출력: "Coroutine created at: /app/server.php:42"

// 또는 배열 [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### 코루틴이 일시 중단된 위치 확인

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // 여기서 일시 중단
});

suspend(); // 코루틴이 시작되도록 함

echo "Suspended at: " . $coro->getSuspendLocation() . "\n";
// 출력: "Suspended at: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### 대기 정보

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// 코루틴이 무엇을 기다리고 있는지 확인
$info = $coro->getAwaitingInfo();
print_r($info);
```

디버깅에 매우 유용합니다 -- 코루틴이 어디서 왔고 어디서 멈췄는지 즉시 확인할 수 있습니다.

## 코루틴 vs 스레드

| 코루틴                         | 스레드                          |
|-------------------------------|-------------------------------|
| 경량                           | 중량                           |
| 빠른 생성 (<1us)               | 느린 생성 (~1ms)               |
| 단일 OS 스레드                  | 여러 OS 스레드                  |
| 협력적 멀티태스킹                | 선점형 멀티태스킹                |
| 경쟁 상태 없음                   | 경쟁 상태 가능                   |
| await 지점 필요                 | 어디서든 선점 가능               |
| I/O 작업용                     | CPU 집약적 연산용               |

## protect()를 사용한 지연 취소

코루틴이 `protect()`를 통해 보호된 섹션 내에 있는 경우, 보호된 블록이 완료될 때까지 취소가 지연됩니다:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // 크리티컬 작업 -- 취소가 지연됨
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // protect()를 빠져나온 후 여기서 취소가 발생합니다
    echo "Result: $result\n";
});

suspend();

$coro->cancel(); // 취소가 지연됨 -- protect()가 완전히 완료됩니다
```

`isCancellationRequested()` 플래그는 즉시 `true`가 되고, `isCancelled()`는 코루틴이 실제로 종료된 후에만 `true`가 됩니다.

## 클래스 개요

```php
final class Async\Coroutine implements Async\Completable {

    /* 식별 */
    public getId(): int

    /* 우선순위 */
    public asHiPriority(): Coroutine

    /* 컨텍스트 */
    public getContext(): Async\Context

    /* 결과와 오류 */
    public getResult(): mixed
    public getException(): mixed

    /* 상태 */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* 제어 */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* 디버깅 */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## 목차

- [Coroutine::getId](/ko/docs/reference/coroutine/get-id.html) -- 코루틴 고유 식별자 가져오기
- [Coroutine::asHiPriority](/ko/docs/reference/coroutine/as-hi-priority.html) -- 코루틴을 높은 우선순위로 표시
- [Coroutine::getContext](/ko/docs/reference/coroutine/get-context.html) -- 코루틴의 로컬 컨텍스트 가져오기
- [Coroutine::getResult](/ko/docs/reference/coroutine/get-result.html) -- 실행 결과 가져오기
- [Coroutine::getException](/ko/docs/reference/coroutine/get-exception.html) -- 코루틴의 예외 가져오기
- [Coroutine::isStarted](/ko/docs/reference/coroutine/is-started.html) -- 코루틴이 시작되었는지 확인
- [Coroutine::isQueued](/ko/docs/reference/coroutine/is-queued.html) -- 코루틴이 대기열에 있는지 확인
- [Coroutine::isRunning](/ko/docs/reference/coroutine/is-running.html) -- 코루틴이 현재 실행 중인지 확인
- [Coroutine::isSuspended](/ko/docs/reference/coroutine/is-suspended.html) -- 코루틴이 일시 중단되었는지 확인
- [Coroutine::isCompleted](/ko/docs/reference/coroutine/is-completed.html) -- 코루틴이 완료되었는지 확인
- [Coroutine::isCancelled](/ko/docs/reference/coroutine/is-cancelled.html) -- 코루틴이 취소되었는지 확인
- [Coroutine::isCancellationRequested](/ko/docs/reference/coroutine/is-cancellation-requested.html) -- 취소가 요청되었는지 확인
- [Coroutine::cancel](/ko/docs/reference/coroutine/cancel.html) -- 코루틴 취소
- [Coroutine::finally](/ko/docs/reference/coroutine/on-finally.html) -- 완료 핸들러 등록
- [Coroutine::getTrace](/ko/docs/reference/coroutine/get-trace.html) -- 일시 중단된 코루틴의 콜 스택 가져오기
- [Coroutine::getSpawnFileAndLine](/ko/docs/reference/coroutine/get-spawn-file-and-line.html) -- 코루틴이 생성된 파일과 줄 가져오기
- [Coroutine::getSpawnLocation](/ko/docs/reference/coroutine/get-spawn-location.html) -- 생성 위치를 문자열로 가져오기
- [Coroutine::getSuspendFileAndLine](/ko/docs/reference/coroutine/get-suspend-file-and-line.html) -- 코루틴이 일시 중단된 파일과 줄 가져오기
- [Coroutine::getSuspendLocation](/ko/docs/reference/coroutine/get-suspend-location.html) -- 일시 중단 위치를 문자열로 가져오기
- [Coroutine::getAwaitingInfo](/ko/docs/reference/coroutine/get-awaiting-info.html) -- 대기 정보 가져오기

## 다음 단계

- [Scope](/ko/docs/components/scope.html) -- 코루틴 그룹 관리
- [취소](/ko/docs/components/cancellation.html) -- 취소 및 protect() 상세 정보
- [spawn()](/ko/docs/reference/spawn.html) -- 전체 문서
- [await()](/ko/docs/reference/await.html) -- 전체 문서
