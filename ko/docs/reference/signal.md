---
layout: docs
lang: ko
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /ko/docs/reference/signal.html
page_title: "signal()"
description: "signal() — Completable을 통한 취소 지원으로 OS 시그널을 대기합니다."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — OS 시그널을 대기합니다. 시그널이 수신되면 `Signal` 값으로 해결되는 `Future`를 반환합니다.

## 설명

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

일회성 OS 시그널 핸들러를 생성합니다. `signal()`의 각 호출은 지정된 시그널이 처음 수신될 때 해결되는 새로운 `Future`를 생성합니다.
`$cancellation` 매개변수가 제공된 경우, 취소가 트리거되면(예: 타임아웃 시) `Future`가 거부됩니다.

동일한 시그널로 `signal()`을 여러 번 호출하면 독립적으로 동작합니다 — 각각이 알림을 수신합니다.

## 매개변수

**`signal`**
예상되는 시그널을 지정하는 `Async\Signal` enum 값입니다. 예: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
`Async\Completable`을 구현하는 선택적 객체입니다(예: `timeout()` 호출 결과). 시그널이 도착하기 전에 취소 객체가 트리거되면 `Future`는 해당 예외(예: `Async\TimeoutException`)와 함께 거부됩니다.

호출 시점에 취소 객체가 이미 완료된 경우 `signal()`은 즉시 거부된 `Future`를 반환합니다.

## 반환 값

`Async\Future<Async\Signal>`을 반환합니다. 시그널이 수신되면 `Future`는 수신된 시그널에 해당하는 `Async\Signal` enum 값으로 해결됩니다.

## 오류/예외

- `Async\TimeoutException` — 시그널이 수신되기 전에 타임아웃이 트리거된 경우.
- `Async\AsyncCancellation` — 다른 이유로 취소가 발생한 경우.

## 예제

### 예제 #1 타임아웃과 함께 시그널 대기

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "시그널 수신: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "5초 안에 시그널이 수신되지 않았습니다\n";
}
?>
```

### 예제 #2 다른 코루틴에서 시그널 수신

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "시그널 수신: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### 예제 #3 SIGTERM에 의한 정상 종료

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM 수신, 종료 중...\n";
    graceful_shutdown();
});
?>
```

### 예제 #4 이미 만료된 타임아웃

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // 타임아웃이 이미 만료됨

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## 참고

> **참고:** `signal()`의 각 호출은 **일회성** 핸들러를 생성합니다. 동일한 시그널을 다시 대기하려면 `signal()`을 다시 호출하세요.

> **참고:** `Signal::SIGINT`와 `Signal::SIGBREAK`는 Windows를 포함한 모든 플랫폼에서 동작합니다. `SIGUSR1`, `SIGUSR2` 및 기타 POSIX 시그널은 Unix 시스템에서만 사용할 수 있습니다.

> **참고:** `Signal::SIGKILL`과 `Signal::SIGSEGV`는 잡을 수 없습니다 — 이는 운영 체제의 제한입니다.

## Signal

`Async\Signal` enum은 사용 가능한 OS 시그널을 정의합니다:

| 값 | 시그널 | 설명 |
|------|--------|------|
| `Signal::SIGHUP` | 1 | 터미널 연결 끊김 |
| `Signal::SIGINT` | 2 | 인터럽트 (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | 코어 덤프와 함께 종료 |
| `Signal::SIGILL` | 4 | 잘못된 명령 |
| `Signal::SIGABRT` | 6 | 비정상 종료 |
| `Signal::SIGFPE` | 8 | 부동소수점 연산 오류 |
| `Signal::SIGKILL` | 9 | 무조건 종료 |
| `Signal::SIGUSR1` | 10 | 사용자 정의 시그널 1 |
| `Signal::SIGSEGV` | 11 | 메모리 접근 위반 |
| `Signal::SIGUSR2` | 12 | 사용자 정의 시그널 2 |
| `Signal::SIGTERM` | 15 | 종료 요청 |
| `Signal::SIGBREAK` | 21 | 브레이크 (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | 비정상 종료 (대안) |
| `Signal::SIGWINCH` | 28 | 터미널 창 크기 변경 |

## 같이 보기

- [timeout()](/ko/docs/reference/timeout.html) — 대기 시간을 제한하는 타임아웃 생성
- [await()](/ko/docs/reference/await.html) — Future 결과 대기
- [graceful_shutdown()](/ko/docs/reference/graceful-shutdown.html) — 스케줄러 정상 종료
- [Cancellation](/ko/docs/components/cancellation.html) — 취소 메커니즘
