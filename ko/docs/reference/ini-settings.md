---
layout: docs
lang: ko
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /ko/docs/reference/ini-settings.html
page_title: "INI 설정"
description: "TrueAsync 확장의 php.ini 구성 지시문."
---

# INI 설정

TrueAsync 확장은 `php.ini`에 다음 지시문을 추가합니다.

## 지시문 목록

| 지시문 | 기본값 | 범위 | 설명 |
|--------|-------|------|------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | 데드락 감지 시 진단 보고서 출력 활성화 |

## async.debug_deadlock

**타입:** `bool`
**기본값:** `1` (활성화)
**범위:** `PHP_INI_ALL` — `php.ini`, `.htaccess`, `.user.ini` 및 `ini_set()`을 통해 변경할 수 있습니다.

이 지시문이 활성화되면, 스케줄러가 데드락을 감지할 때 상세한 진단 출력을 생성합니다.
스케줄러가 모든 코루틴이 차단되고 활성 이벤트가 없음을 감지하면, `Async\DeadlockError`를 던지기 전에 보고서를 출력합니다.

### 보고서 내용

- 대기 중인 코루틴 수와 활성 이벤트 수
- 모든 차단된 코루틴 목록:
  - 생성(spawn) 및 일시 중단(suspend) 위치
  - 각 코루틴이 대기 중인 이벤트와 사람이 읽을 수 있는 설명

### 출력 예시

```
=== DEADLOCK REPORT START ===
Coroutines waiting: 2, active_events: 0

Coroutine 1
  spawn: /app/server.php:15
  suspend: /app/server.php:22
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

Coroutine 2
  spawn: /app/server.php:28
  suspend: /app/server.php:35
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

=== DEADLOCK REPORT END ===

Fatal error: Uncaught Async\DeadlockError: ...
```

### 예제

#### php.ini를 통한 비활성화

```ini
async.debug_deadlock = 0
```

#### ini_set()을 통한 비활성화

```php
<?php
// 런타임에서 데드락 진단 비활성화
ini_set('async.debug_deadlock', '0');
?>
```

#### 테스트용 비활성화

```ini
; phpunit.xml 또는 .phpt 파일
async.debug_deadlock=0
```

## 같이 보기

- [예외](/ko/docs/components/exceptions.html) — `Async\DeadlockError`
