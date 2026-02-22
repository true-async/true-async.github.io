---
layout: docs
lang: ko
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /ko/docs/reference/protect.html
page_title: "protect()"
description: "protect() — 중요 섹션을 보호하기 위해 취소 불가 모드에서 코드를 실행합니다."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — 클로저를 취소 불가 모드에서 실행합니다. 코루틴 취소는 클로저가 완료될 때까지 지연됩니다.

## 설명

```php
protect(\Closure $closure): mixed
```

`$closure`가 실행되는 동안 코루틴은 보호된 상태로 표시됩니다. 이 기간 동안 취소 요청이 도착하면 `AsyncCancellation`은 클로저가 완료된 **이후에만** 던져집니다.

## 매개변수

**`closure`**
취소에 의해 중단되지 않고 실행할 클로저입니다.

## 반환 값

클로저가 반환한 값을 반환합니다.

## 예제

### 예제 #1 트랜잭션 보호

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// protect() 동안 코루틴이 취소된 경우,
// AsyncCancellation은 commit() 이후 여기서 던져집니다
?>
```

### 예제 #2 파일 쓰기 보호

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### 예제 #3 결과 가져오기

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### 예제 #4 지연된 취소와 진단

`protect()` 동안 취소는 저장되지만 적용되지 않습니다. 이는 코루틴 메서드를 통해 확인할 수 있습니다:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // cancel() 이후 protect() 내부에서:
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Protected operation completed\n";
    });

    // AsyncCancellation은 protect() 이후 여기서 던져집니다
    echo "This code will not execute\n";
});

suspend(); // 코루틴이 protect()에 진입하도록 합니다
$coroutine->cancel();
suspend(); // protect()가 완료되도록 합니다

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `cancel()` 직후 `true`, `protect()` 내부에서도 동일
- `isCancelled()` — `protect()` 실행 중에는 `false`, 이후 `true`

## 참고

> **참고:** `protect()` 동안 취소가 발생한 경우, 클로저가 반환된 직후 `AsyncCancellation`이 던져집니다 — 이 경우 `protect()`의 반환 값은 손실됩니다.

> **참고:** `protect()`는 클로저를 원자적으로 만들지 않습니다 — 내부의 I/O 작업 중에 다른 코루틴이 실행될 수 있습니다. `protect()`는 **취소**가 실행을 중단하지 않는 것만 보장합니다.

## 같이 보기

- [Cancellation](/ko/docs/components/cancellation.html) — 협력적 취소 메커니즘
- [suspend()](/ko/docs/reference/suspend.html) — 코루틴 일시 중단
