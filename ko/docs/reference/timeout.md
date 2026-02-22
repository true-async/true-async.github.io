---
layout: docs
lang: ko
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /ko/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — 대기 시간을 제한하기 위한 타임아웃 객체를 생성합니다."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — 지정된 밀리초 후에 트리거되는 `Async\Timeout` 객체를 생성합니다.

## 설명

```php
timeout(int $ms): Async\Awaitable
```

`$ms` 밀리초 후에 `Async\TimeoutException`을 던지는 타이머를 생성합니다.
`await()` 및 기타 함수에서 대기 시간 제한기로 사용됩니다.

## 매개변수

**`ms`**
밀리초 단위의 시간입니다. 0보다 커야 합니다.

## 반환 값

`Async\Completable`을 구현하는 `Async\Timeout` 객체를 반환합니다.

## 오류/예외

- `ValueError` — `$ms`가 0 이하인 경우.

## 예제

### 예제 #1 await()에서의 타임아웃

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "3초 안에 요청이 완료되지 않았습니다\n";
}
?>
```

### 예제 #2 태스크 그룹에서의 타임아웃

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "5초 안에 모든 요청이 완료되지 않았습니다\n";
}
?>
```

### 예제 #3 타임아웃 취소

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// 작업이 더 빨리 완료됨 — 타이머 취소
$timer->cancel();
?>
```

## 같이 보기

- [delay()](/ko/docs/reference/delay.html) — 코루틴 일시 중단
- [await()](/ko/docs/reference/await.html) — 취소와 함께 대기
