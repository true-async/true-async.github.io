---
layout: architecture
lang: ko
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /ko/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "PHP 코어 비동기 ABI의 아키텍처 -- 함수 포인터, 확장 모듈 등록, 전역 상태, ZEND_ASYNC_* 매크로."
---

# TrueAsync ABI

`TrueAsync` `ABI`는 **정의**와 **구현**의 명확한 분리를 기반으로 구축됩니다:

| 레이어          | 위치                    | 책임                                            |
|-----------------|-------------------------|-------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h` | 타입, 구조체, 함수 포인터의 정의                  |
| **확장 모듈**   | `ext/async/`            | 모든 함수의 구현, API를 통한 등록                 |

`PHP` 코어는 확장 모듈 함수를 직접 호출하지 않습니다.
대신, 확장 모듈이 로드 시 등록한 `function pointers`를
호출하는 `ZEND_ASYNC_*` 매크로를 사용합니다.

이 접근 방식은 두 가지 목표를 달성합니다:
1. 비동기 엔진이 `ABI`를 구현하는 임의의 수의 확장 모듈과 작동할 수 있음
2. 매크로가 구현 세부 사항에 대한 의존성을 줄이고 리팩토링을 최소화

## 전역 상태

비동기와 관련된 전역 상태의 일부는 PHP 코어에 있으며
`ZEND_ASYNC_G(v)` 매크로뿐만 아니라 `ZEND_ASYNC_CURRENT_COROUTINE`과 같은
다른 전문 매크로를 통해서도 접근 가능합니다.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // 스케줄러 하트비트 플래그
    bool in_scheduler_context;          // 현재 스케줄러에 있으면 TRUE
    bool graceful_shutdown;             // 셧다운 중이면 TRUE
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // 현재 코루틴
    zend_async_scope_t *main_scope;     // 루트 스코프
    zend_coroutine_t *scheduler;        // 스케줄러 코루틴
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### 시작

현재 `TrueAsync`는 즉시 시작하지 않고 "적절한" 시점에 지연 시작합니다.
(이 접근 방식은 향후 변경될 예정입니다. 사실상 모든 PHP I/O 함수가 `Scheduler`를 활성화하기 때문입니다.)

`PHP` 스크립트가 실행을 시작하면, `TrueAsync`는 `ZEND_ASYNC_READY` 상태입니다.
`ZEND_ASYNC_SCHEDULER_LAUNCH()` 매크로를 통해 `Scheduler`를 필요로 하는 함수가 처음 호출되면,
스케줄러가 초기화되고 `ZEND_ASYNC_ACTIVE` 상태로 전환됩니다.

이 시점에서 실행 중이던 코드는 메인 코루틴에 들어가게 되고,
`Scheduler`를 위한 별도의 코루틴이 생성됩니다.

`Scheduler`를 명시적으로 활성화하는 `ZEND_ASYNC_SCHEDULER_LAUNCH()` 외에도,
`TrueAsync`는 `php_execute_script_ex`와 `php_request_shutdown` 함수에서도 제어를 가로챕니다.

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

이 코드는 메인 스레드 실행이 완료된 후 `Scheduler`에 제어를 전달할 수 있게 합니다.
`Scheduler`는 차례로 존재하는 코루틴이 있으면 다른 코루틴을 시작할 수 있습니다.

이 접근 방식은 PHP 프로그래머를 위한 TrueAsync의 100% 투명성뿐만 아니라
완전한 `PHP SAPI` 호환성도 보장합니다. `PHP SAPI`를 사용하는 클라이언트는
내부적으로 `EventLoop`이 실행되고 있음에도 `PHP`를 동기적으로 계속 취급합니다.

`php_request_shutdown` 함수에서는 소멸자의 코루틴을 실행하기 위한 최종 가로채기가 발생하며,
그 후 `Scheduler`가 셧다운되고 리소스를 해제합니다.

## 확장 모듈 등록

`TrueAsync ABI`는 `PHP` 코어의 일부이므로, 가장 초기 단계에서 모든 `PHP` 확장 모듈에 사용 가능합니다.
따라서 확장 모듈은 `PHP Engine`이 코드 실행을 위해
시작되기 전에 `TrueAsync`를 올바르게 초기화할 기회를 갖습니다.

확장 모듈은 `_register()` 함수 세트를 통해 구현을 등록합니다.
각 함수는 함수 포인터 세트를 받아
코어의 전역 `extern` 변수에 씁니다.

확장 모듈의 목적에 따라 `allow_override`는 함수 포인터의 합법적 재등록을 허용합니다.
기본적으로 `TrueAsync`는 두 확장 모듈이 동일한 `API` 그룹을 정의하는 것을 금지합니다.

`TrueAsync`는 여러 카테고리로 나뉘며, 각각 자체 등록 함수가 있습니다:
* `Scheduler` -- 핵심 기능 관련 API. 다양한 함수의 대부분을 포함
* `Reactor` -- `Event loop` 및 이벤트 작업을 위한 API. 다양한 이벤트 타입 생성 및 리액터 생명주기 관리 함수 포함
* `ThreadPool` -- 스레드 풀 및 태스크 큐 관리를 위한 API
* `Async IO` -- 파일 디스크립터, 소켓, UDP를 포함한 비동기 I/O를 위한 API
* `Pool` -- 헬스체크 및 서킷 브레이커 지원을 갖춘 범용 리소스 풀 관리를 위한 API

```c
zend_async_scheduler_register(
    char *module,                    // 모듈 이름
    bool allow_override,             // 덮어쓰기 허용
    zend_async_scheduler_launch_t,   // 스케줄러 시작
    zend_async_new_coroutine_t,      // 코루틴 생성
    zend_async_new_scope_t,          // 스코프 생성
    zend_async_new_context_t,        // 컨텍스트 생성
    zend_async_spawn_t,              // 코루틴 스폰
    zend_async_suspend_t,            // 일시 중단
    zend_async_enqueue_coroutine_t,  // 큐에 넣기
    zend_async_resume_t,             // 재개
    zend_async_cancel_t,             // 취소
    // ... 기타
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // 이벤트 루프 초기화
    zend_async_reactor_shutdown_t,   // 이벤트 루프 셧다운
    zend_async_reactor_execute_t,    // 리액터 틱 하나
    zend_async_reactor_loop_alive_t, // 활성 이벤트가 있는지
    zend_async_new_socket_event_t,   // poll 이벤트 생성
    zend_async_new_timer_event_t,    // 타이머 생성
    zend_async_new_signal_event_t,   // 시그널 구독
    // ... 기타
);
```
