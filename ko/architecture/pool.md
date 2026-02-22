---
layout: architecture
lang: ko
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /ko/architecture/pool.html
page_title: "Async\\Pool 아키텍처"
description: "범용 리소스 풀 Async\\Pool의 내부 설계 -- 데이터 구조, 획득/해제 알고리즘, 헬스체크, 서킷 브레이커."
---

# Async\Pool 아키텍처

> 이 글은 범용 리소스 풀의 내부 설계를 설명합니다.
> 사용 가이드를 찾고 계시다면 [Async\Pool](/ko/docs/components/pool.html)을 참조하세요.
> PDO 전용 레이어는 [PDO Pool 아키텍처](/ko/architecture/pdo-pool.html)를 참조하세요.

## 데이터 구조

풀은 두 개의 레이어로 구현됩니다: PHP 코어의 공개 ABI 구조체와
비동기 확장 모듈의 확장 내부 구조체.

![풀 데이터 구조](/diagrams/ko/architecture-pool/data-structures.svg)

## 두 가지 생성 경로

풀은 PHP 코드(`Async\Pool` 생성자를 통해)에서 생성하거나
C 확장 모듈(내부 API를 통해)에서 생성할 수 있습니다.

| 경로  | 함수                                | 콜백                           | 사용처                 |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP 호출 가능) | 사용자 코드            |
| C API | `zend_async_pool_create_internal()` | 함수 포인터                    | PDO, 기타 확장 모듈    |

차이점은 `handler_flags`에 있습니다. 플래그가 설정되면, 풀은
`zend_call_function()`을 통한 PHP 호출의 오버헤드를 우회하여 C 함수를 직접 호출합니다.

## Acquire: 리소스 획득

![acquire() -- 내부 알고리즘](/diagrams/ko/architecture-pool/acquire.svg)

### 리소스 대기

모든 리소스가 사용 중이고 `max_size`에 도달하면, 코루틴은
`ZEND_ASYNC_SUSPEND()`를 통해 일시 중단됩니다. 대기 메커니즘은 채널과 유사합니다:

1. `zend_async_pool_waiter_t` 구조체가 생성됩니다
2. 웨이터가 FIFO `waiters` 큐에 추가됩니다
3. 깨우기를 위한 콜백이 등록됩니다
4. 타임아웃이 설정된 경우 -- 타이머가 등록됩니다
5. `ZEND_ASYNC_SUSPEND()` -- 코루틴이 제어를 양보합니다

깨우기는 다른 코루틴이 `release()`를 호출할 때 발생합니다.

## Release: 리소스 반환

![release() -- 내부 알고리즘](/diagrams/ko/architecture-pool/release.svg)

## 헬스체크: 백그라운드 모니터링

`healthcheckInterval > 0`이면, 풀이 생성될 때 주기적 타이머가 시작됩니다.
타이머는 `ZEND_ASYNC_NEW_TIMER_EVENT`를 통해 리액터와 통합됩니다.

![헬스체크 -- 주기적 검사](/diagrams/ko/architecture-pool/healthcheck.svg)

헬스체크는 **여유** 리소스만 검증합니다. 사용 중인 리소스는 영향을 받지 않습니다.
불량 리소스를 제거한 후 총 수가 `min` 아래로 떨어지면, 풀은 대체 리소스를 생성합니다.

## 순환 버퍼

여유 리소스는 순환 버퍼 -- 고정 용량의 링 버퍼에 저장됩니다.
초기 용량은 8개 요소이며 필요에 따라 확장됩니다.

`push`와 `pop` 연산은 O(1)로 실행됩니다. 버퍼는 두 개의 포인터(`head`와 `tail`)를 사용하여
요소를 이동시키지 않고 효율적인 추가 및 추출이 가능합니다.

## 이벤트 시스템과의 통합

풀은 `zend_async_event_t`를 상속하며 이벤트 핸들러의 전체 세트를 구현합니다:

| 핸들러         | 용도                                                       |
|----------------|------------------------------------------------------------|
| `add_callback` | 콜백 등록 (웨이터용)                                       |
| `del_callback` | 콜백 제거                                                  |
| `start`        | 이벤트 시작 (NOP)                                          |
| `stop`         | 이벤트 중지 (NOP)                                          |
| `dispose`      | 전체 정리: 메모리 해제, 콜백 파괴                          |

이를 통해 다음이 가능합니다:
- 이벤트 콜백을 통한 코루틴 일시 중단 및 재개
- 리액터와 헬스체크 타이머 통합
- 이벤트 dispose를 통한 올바른 리소스 해제

## 가비지 컬렉션

PHP 풀 래퍼(`async_pool_obj_t`)는 유휴 버퍼의 모든 리소스를
GC 루트로 등록하는 커스텀 `get_gc`를 구현합니다.
이는 PHP 코드에서 명시적 참조가 없는 여유 리소스의
조기 가비지 컬렉션을 방지합니다.

## 서킷 브레이커

풀은 세 가지 상태의 `CircuitBreaker` 인터페이스를 구현합니다:

![서킷 브레이커 상태](/diagrams/ko/architecture-pool/circuit-breaker.svg)

전환은 수동이거나 `CircuitBreakerStrategy`를 통해 자동으로 수행됩니다:
- `reportSuccess()`는 성공적인 `release` 시 호출됩니다 (리소스가 `beforeRelease`를 통과한 경우)
- `reportFailure()`는 `beforeRelease`가 `false`를 반환했을 때 호출됩니다
- 전략이 상태 전환 시점을 결정합니다

## Close: 풀 종료

풀이 닫힐 때:

1. 풀 이벤트가 CLOSED로 표시됩니다
2. 헬스체크 타이머가 중지됩니다
3. 모든 대기 중인 코루틴이 `PoolException`과 함께 깨어납니다
4. 모든 여유 리소스가 `destructor`를 통해 파괴됩니다
5. 사용 중인 리소스는 계속 존재합니다 -- `release` 시 파괴됩니다

## 확장 모듈용 C API

확장 모듈(PDO, Redis 등)은 매크로를 통해 풀을 사용합니다:

| 매크로                                           | 기능                         |
|--------------------------------------------------|------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | C 콜백으로 풀 생성           |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | 풀의 PHP 래퍼 생성           |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | 리소스 획득                  |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | 리소스 해제                  |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | 풀 닫기                      |

모든 매크로는 비동기 확장 모듈이 로드 시 등록한 함수 포인터를 호출합니다.
이는 격리를 보장합니다: PHP 코어는 특정 풀 구현에 의존하지 않습니다.

## 시퀀스: 전체 Acquire-Release 사이클

![전체 acquire -> use -> release 사이클](/diagrams/ko/architecture-pool/full-cycle.svg)

## 다음 단계

- [Async\Pool: 가이드](/ko/docs/components/pool.html) -- 풀 사용 방법
- [PDO Pool 아키텍처](/ko/architecture/pdo-pool.html) -- PDO 전용 레이어
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴의 동작 방식
