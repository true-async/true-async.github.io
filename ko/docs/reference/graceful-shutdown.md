---
layout: docs
lang: ko
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /ko/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — 모든 코루틴 취소와 함께 스케줄러를 정상적으로 종료합니다."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — 스케줄러의 정상적인 종료를 시작합니다. 모든 코루틴에 취소 요청이 전달됩니다.

## 설명

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

정상 종료 절차를 시작합니다: 모든 활성 코루틴이 취소되고, 애플리케이션은 코루틴이 자연스럽게 완료될 때까지 계속 실행됩니다.

## 매개변수

**`cancellationError`**
코루틴에 전달할 선택적 취소 오류입니다. 지정하지 않으면 기본 메시지가 사용됩니다.

## 반환 값

반환 값이 없습니다.

## 예제

### 예제 #1 종료 시그널 처리

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// 요청을 처리하는 서버
spawn(function() {
    // 시그널 수신 시 — 정상적으로 종료
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server shutdown'));
    });

    while (true) {
        // 요청 처리 중...
    }
});
?>
```

## 참고

> **참고:** `graceful_shutdown()` 호출 **이후에** 생성된 코루틴은 즉시 취소됩니다.

> **참고:** `exit`와 `die`는 자동으로 정상 종료를 트리거합니다.

## 같이 보기

- [Cancellation](/ko/docs/components/cancellation.html) — 취소 메커니즘
- [Scope](/ko/docs/components/scope.html) — 수명 주기 관리
