---
layout: architecture
lang: ko
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /ko/architecture/waker.html
page_title: "Waker -- 대기 및 깨우기 메커니즘"
description: "Waker의 내부 설계 -- 코루틴과 이벤트 사이의 연결 고리: 상태, resume_when, 타임아웃, 오류 전달."
---

# 코루틴 대기 및 깨우기 메커니즘

코루틴의 대기 컨텍스트를 저장하기 위해
`TrueAsync`는 `Waker` 구조체를 사용합니다.
이는 코루틴과 구독한 이벤트 사이의 연결 고리 역할을 합니다.
`Waker` 덕분에 코루틴은 항상 어떤 이벤트를 기다리고 있는지 정확히 알 수 있습니다.

## Waker 구조체

메모리 최적화를 위해 `waker`는 코루틴 구조체(`zend_coroutine_t`)에 직접 통합되어 있으며,
이를 통해 추가 할당을 피하고 메모리 관리를 단순화합니다.
다만 하위 호환성을 위해 코드에서는 `zend_async_waker_t *waker` 포인터가 사용됩니다.

`Waker`는 대기 중인 이벤트 목록을 보유하고 대기 결과 또는 예외를 집계합니다.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // 코루틴이 대기 중인 이벤트
    HashTable events;

    // 마지막 반복에서 발생한 이벤트
    HashTable *triggered_events;

    // 깨우기 결과
    zval result;

    // 오류 (깨우기가 오류로 인한 경우)
    zend_object *error;

    // 생성 지점 (디버깅용)
    zend_string *filename;
    uint32_t lineno;

    // 소멸자
    zend_async_waker_dtor dtor;
};
```

## Waker 상태

코루틴 생명의 각 단계에서 `Waker`는 다섯 가지 상태 중 하나에 있습니다:

![Waker 상태](/diagrams/ko/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker가 활성화되지 않음
    ZEND_ASYNC_WAKER_WAITING,   // 코루틴이 이벤트를 대기 중
    ZEND_ASYNC_WAKER_QUEUED,    // 코루틴이 실행 대기열에 있음
    ZEND_ASYNC_WAKER_IGNORED,   // 코루틴이 건너뛰어짐
    ZEND_ASYNC_WAKER_RESULT     // 결과가 사용 가능
} ZEND_ASYNC_WAKER_STATUS;
```

코루틴은 `NO_STATUS`로 시작합니다 -- `Waker`가 존재하지만 활성화되지 않았으며, 코루틴이 실행 중입니다.
코루틴이 `SUSPEND()`를 호출하면, `Waker`는 `WAITING`으로 전환되어 이벤트를 모니터링하기 시작합니다.

이벤트 중 하나가 발생하면, `Waker`는 `QUEUED`로 전환됩니다: 결과가 저장되고,
코루틴이 컨텍스트 전환을 대기하며 `Scheduler` 큐에 배치됩니다.

`IGNORED` 상태는 코루틴이 이미 큐에 있지만 파괴되어야 하는 경우에 필요합니다.
이 경우 `Scheduler`는 코루틴을 시작하지 않고 즉시 상태를 마무리합니다.

코루틴이 깨어나면 `Waker`는 `RESULT` 상태로 전환됩니다.
이 시점에서 `waker->error`가 `EG(exception)`으로 전달됩니다.
오류가 없으면 코루틴은 `waker->result`를 사용할 수 있습니다. 예를 들어, `result`는
`await()` 함수가 반환하는 값입니다.

## Waker 생성

```c
// waker 가져오기 (존재하지 않으면 생성)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// 새 대기를 위해 waker 재초기화
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// 타임아웃 및 취소와 함께
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()`는 기존 waker를 소멸시키고
초기 상태로 재설정합니다. 이를 통해 할당 없이
waker를 재사용할 수 있습니다.

## 이벤트 구독

zend_async_API.c 모듈은 코루틴을 이벤트에 바인딩하는 여러 기성 함수를 제공합니다:

```c
zend_async_resume_when(
    coroutine,        // 깨울 코루틴
    event,            // 구독할 이벤트
    trans_event,      // 이벤트 소유권 이전
    callback,         // 콜백 함수
    event_callback    // 코루틴 콜백 (또는 NULL)
);
```

`resume_when`은 주요 구독 함수입니다.
`zend_coroutine_event_callback_t`를 생성하여 이벤트와
코루틴의 waker에 바인딩합니다.

콜백 함수로는 코루틴을 깨우는 방법에 따라
세 가지 표준 함수 중 하나를 사용할 수 있습니다:

```c
// 성공적인 결과
zend_async_waker_callback_resolve(event, callback, result, exception);

// 취소
zend_async_waker_callback_cancel(event, callback, result, exception);

// 타임아웃
zend_async_waker_callback_timeout(event, callback, result, exception);
```
