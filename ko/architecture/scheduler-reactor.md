---
layout: architecture
lang: ko
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /ko/architecture/scheduler-reactor.html
page_title: "스케줄러와 리액터"
description: "코루틴 스케줄러와 이벤트 리액터의 내부 설계 -- 큐, 컨텍스트 전환, libuv, fiber 풀."
---

# 코루틴, 스케줄러, 리액터

`Scheduler`와 `Reactor`는 런타임의 두 가지 주요 컴포넌트입니다.
`Scheduler`는 코루틴 큐와 컨텍스트 전환을 관리하고,
`Reactor`는 `Event loop`를 통해 `I/O` 이벤트를 처리합니다.

![스케줄러와 리액터 상호작용](/diagrams/ko/architecture-scheduler-reactor/architecture.svg)

## 스케줄러

### 스케줄러 코루틴과 컨텍스트 전환 최소화

많은 코루틴 구현에서 `scheduler`는 별도의 스레드 또는
최소한 별도의 실행 컨텍스트를 사용합니다. 코루틴이 `yield`를 호출하면
제어가 `scheduler`로 넘어가고, 스케줄러가 다음 코루틴을 선택하여 전환합니다.
이로 인해 `suspend`/`resume` 당 **두 번**의 컨텍스트 전환이 발생합니다: 코루틴 -> 스케줄러 -> 코루틴.

`TrueAsync`에서 `Scheduler`는 전용 컨텍스트를 가진
**자체 코루틴**(`ZEND_ASYNC_SCHEDULER`)을 갖습니다. 모든 사용자 코루틴이 대기 중이고 큐가 비어 있으면,
이 코루틴으로 제어가 넘어가며 메인 루프가 실행됩니다: `reactor tick`, `microtasks`.

코루틴은 전체 실행 컨텍스트(스택 + 레지스터)를 사용하므로,
현대 `x86`에서 컨텍스트 전환은 대략 10-20 ns가 소요됩니다.
따라서 `TrueAsync`는 일부 연산을 스케줄러로 전환하지 않고
현재 코루틴의 컨텍스트에서 직접 실행할 수 있도록 하여 전환 횟수를 최적화합니다.

코루틴이 `SUSPEND()` 연산을 호출하면, 현재 코루틴의 컨텍스트에서 직접 `scheduler_next_tick()`이 호출됩니다 --
이는 하나의 스케줄러 틱을 수행하는 함수입니다: 마이크로태스크, 리액터, 큐 확인.
큐에 준비된 코루틴이 있으면, `Scheduler`가 자체 코루틴을 거치지 않고
**직접** 전환합니다. 이것은 두 번 대신 한 번의 `컨텍스트 전환`입니다.
더 나아가, 큐의 다음 코루틴이 아직 시작되지 않았고 현재 코루틴이 이미 완료되었다면,
전환이 전혀 필요하지 않습니다 -- 새 코루틴이 현재 컨텍스트를 받습니다.

`Scheduler` 코루틴으로의 전환(`switch_to_scheduler()`를 통해)은 다음 경우에**만** 발생합니다:
- 코루틴 큐가 비어 있고 리액터가 이벤트를 기다려야 하는 경우
- 다른 코루틴으로의 전환이 실패한 경우
- 데드락이 감지된 경우

### 메인 루프

![스케줄러 메인 루프](/diagrams/ko/architecture-scheduler-reactor/scheduler-loop.svg)

각 틱에서 스케줄러는 다음을 수행합니다:

1. **마이크로태스크** -- `microtasks` 큐 처리 (컨텍스트 전환 없는 작은 태스크)
2. **코루틴 큐** -- `coroutine_queue`에서 다음 코루틴 추출
3. **컨텍스트 전환** -- 선택된 코루틴으로 `zend_fiber_switch_context()`
4. **결과 처리** -- 반환 후 코루틴의 상태 확인
5. **리액터** -- 큐가 비어 있으면 `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)` 호출

### 마이크로태스크

모든 작업이 코루틴을 필요로 하는 것은 아닙니다. 때때로 전환 사이에 빠르게 무언가를 해야 합니다:
카운터 업데이트, 알림 전송, 리소스 해제.
이를 위해 코루틴을 생성하는 것은 과도하지만, 가능한 빨리 수행해야 합니다.
마이크로태스크가 바로 이런 경우에 유용합니다 -- 전환 없이
현재 코루틴의 컨텍스트에서 직접 실행되는 경량 핸들러입니다.

마이크로태스크는 스케줄러의 루프에 직접 접근하므로 경량이고 빠른 핸들러여야 합니다.
`TrueAsync`의 초기 버전에서는 마이크로태스크가 PHP 영역에 있을 수 있었지만,
엄격한 규칙과 성능을 고려하여 이 메커니즘을
C 코드 전용으로 유지하기로 결정했습니다.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

`TrueAsync`에서 마이크로태스크는 각 코루틴 전환 전에 FIFO 큐를 통해 처리됩니다.
마이크로태스크가 예외를 발생시키면 처리가 중단됩니다.
실행 후 마이크로태스크는 큐에서 즉시 제거되고, 활성 참조 카운트가 하나 감소합니다.

마이크로태스크는 동시 반복자와 같은 시나리오에서 사용되며, 이전 코루틴이
대기 상태에 들어가면 반복이 자동으로 다른 코루틴으로 전이됩니다.

### 코루틴 우선순위

내부적으로 `TrueAsync`는 가장 단순한 유형의 큐: 순환 버퍼를 사용합니다. 이것은 아마
단순성, 성능, 기능 간의 균형 측면에서 최선의 솔루션입니다.

큐 알고리즘이 향후 변경되지 않을 것이라는 보장은 없습니다. 그렇지만
코루틴 우선순위가 중요한 경우는 드물게 있습니다.

현재 두 가지 우선순위가 사용됩니다:

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

높은 우선순위의 코루틴은 `enqueue` 시 큐의 **헤드에** 배치됩니다.
추출은 항상 헤드에서 이루어집니다. 복잡한 스케줄링 없이
단순한 삽입 순서입니다. 이것은 의도적으로 단순한 접근 방식입니다: 두 단계로 실제 요구를 충족하며,
복잡한 우선순위 큐(`RTOS`에서처럼)는 PHP 애플리케이션의 맥락에서
정당화되지 않는 오버헤드를 추가할 것입니다.

### Suspend와 Resume

![Suspend와 Resume 연산](/diagrams/ko/architecture-scheduler-reactor/suspend-resume.svg)

`Suspend`와 `Resume` 연산은 `Scheduler`의 핵심 작업입니다.

코루틴이 `suspend`를 호출하면 다음이 발생합니다:

1. 코루틴의 `waker` 이벤트가 시작됩니다(`start_waker_events`).
   이 시점에서만 타이머가 틱을 시작하고 poll 객체가
   디스크립터를 리스닝하기 시작합니다. `suspend`를 호출하기 전에는 이벤트가 활성화되지 않습니다 --
   이를 통해 먼저 모든 구독을 준비한 다음 단일 호출로 대기를 시작할 수 있습니다.
2. **컨텍스트 전환 없이** `scheduler_next_tick()`이 호출됩니다:
   - 마이크로태스크가 처리됩니다
   - `reactor tick`이 수행됩니다 (충분한 시간이 경과한 경우)
   - 큐에 준비된 코루틴이 있으면, `execute_next_coroutine()`이 전환합니다
   - 큐가 비어 있으면, `switch_to_scheduler()`가 `scheduler` 코루틴으로 전환합니다
3. 제어가 돌아오면, 코루틴은 `suspend` 결과를 담고 있는 `waker` 객체와 함께 깨어납니다.

**빠른 반환 경로**: `start_waker_events` 중에 이벤트가 이미 발생한 경우
(예: `Future`가 이미 완료된 경우), 코루틴은 **전혀 일시 중단되지 않습니다** --
결과가 즉시 사용 가능합니다. 따라서 완료된 `Future`에 대한 `await`는
`suspend`를 트리거하지 않고 컨텍스트 전환을 일으키지 않으며 결과를 직접 반환합니다.

## 컨텍스트 풀

컨텍스트는 전체 `C 스택`(기본값 `EG(fiber_stack_size)`)입니다.
스택 생성은 비용이 많이 드는 연산이므로, `TrueAsync`는 메모리 관리를 최적화하고자 합니다.
메모리 사용 패턴을 고려합니다: 코루틴은 끊임없이 죽고 생성됩니다.
풀 패턴이 이 시나리오에 이상적입니다!

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // 네이티브 C fiber (스택 + 레지스터)
    zend_vm_stack vm_stack;         // Zend VM 스택
    zend_execute_data *execute_data;// 현재 execute_data
    uint8_t flags;                  // Fiber 상태
};
```

메모리를 계속 생성하고 파괴하는 대신, 스케줄러는 컨텍스트를 풀에 반환하고
반복적으로 재사용합니다.

`mmap`/`mprotect` 지연 시간과 전체 메모리 풋프린트를
모두 최소화하기 위해 워크로드에 동적으로 적응하는
스마트 풀 크기 관리 알고리즘이 계획되어 있습니다.

### 스위치 핸들러

`PHP`에서 많은 서브시스템은 간단한 가정에 의존합니다:
코드가 중단 없이 처음부터 끝까지 실행된다는 것입니다.
출력 버퍼(`ob_start`), 객체 소멸자, 전역 변수 --
이 모든 것이 선형적으로 동작합니다: 시작 -> 끝.

코루틴은 이 모델을 깨뜨립니다. 코루틴은 작업 도중에 슬립할 수 있고
수천 개의 다른 연산 후에 깨어날 수 있습니다. 같은 스레드에서 `LEAVE`와 `ENTER` 사이에
수십 개의 다른 코루틴이 실행됩니다.

`Switch Handler`는 **특정 코루틴**에 바인딩된 훅입니다.
마이크로태스크(모든 전환에서 발생)와 달리,
`switch handler`는 "자신의" 코루틴의 진입과 종료 시에만 호출됩니다:

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = 진입, false = 종료
    bool is_finishing // true = 코루틴이 완료 중
    // 반환값: true = 핸들러 유지, false = 제거
);
```

반환값은 핸들러의 수명을 제어합니다:
* `true` -- `handler`가 유지되어 다시 호출됩니다.
* `false` -- `Scheduler`가 제거합니다.

`Scheduler`는 세 지점에서 핸들러를 호출합니다:

```c
ZEND_COROUTINE_ENTER(coroutine)  // 코루틴이 제어를 받음
ZEND_COROUTINE_LEAVE(coroutine)  // 코루틴이 제어를 양보함 (suspend)
ZEND_COROUTINE_FINISH(coroutine) // 코루틴이 영구적으로 완료됨
```

#### 예시: 출력 버퍼

`ob_start()` 함수는 단일 핸들러 스택을 사용합니다.
코루틴이 `ob_start()`를 호출하고 슬립하면, 아무것도 하지 않으면 다른 코루틴이 상대방의 버퍼를 볼 수 있습니다.
(참고로, **Fiber**는 `ob_start()`를 올바르게 처리하지 못합니다.)

일회성 `switch handler`가 코루틴 시작 시 이를 해결합니다:
전역 `OG(handlers)`를 코루틴의 컨텍스트로 이동시키고 전역 상태를 정리합니다.
이후 각 코루틴은 자체 버퍼로 작동하며, 한 코루틴의 `echo`가 다른 코루틴과 섞이지 않습니다.

#### 예시: 셧다운 중 소멸자

`PHP`가 셧다운될 때 `zend_objects_store_call_destructors()`가 호출됩니다 --
객체 저장소를 순회하며 소멸자를 호출합니다. 일반적으로 이것은 선형적인 프로세스입니다.

그러나 소멸자에 `await`가 포함될 수 있습니다. 예를 들어, 데이터베이스 연결 객체가
연결을 올바르게 닫으려고 합니다 -- 이것은 네트워크 연산입니다.
코루틴이 소멸자 내부에서 `await`를 호출하고 슬립합니다.

나머지 소멸자는 계속되어야 합니다. `switch handler`가 `LEAVE` 순간을 감지하고
이전 코루틴이 멈춘 객체에서부터 순회를 계속하는
새로운 높은 우선순위 코루틴을 생성합니다.

#### 등록

```c
// 특정 코루틴에 핸들러 추가
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// 현재 코루틴에 추가 (또는 스케줄러가 아직 시작되지 않았으면 메인에)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// 메인 코루틴이 시작될 때 발생하는 핸들러 추가
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

마지막 매크로는 `Scheduler` 시작 전에 초기화하는 서브시스템에 필요합니다.
전역적으로 핸들러를 등록하면, `Scheduler`가 `main` 코루틴을 생성할 때
모든 전역 핸들러가 복사되어 `ENTER`로 발생합니다.

## 리액터

### 왜 libuv인가?

`TrueAsync`는 `Node.js`를 구동하는 것과 같은 라이브러리인 `libuv`를 사용합니다.

이 선택은 의도적입니다. `libuv`는 다음을 제공합니다:
- `Linux`(`epoll`), macOS(`kqueue`), Windows(`IOCP`)를 위한 통합 `API`
- 타이머, 시그널, `DNS`, 자식 프로세스, 파일 I/O의 내장 지원
- 프로덕션에서 수십억 개의 요청으로 검증된 성숙한 코드베이스

대안(`libev`, `libevent`, `io_uring`)이 검토되었지만,
`libuv`가 사용 편의성에서 우위를 차지합니다.

### 구조

```c
// 리액터 전역 데이터 (ASYNC_G 내)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// 시그널 관리
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // SIGCHLD 프로세스 이벤트
```

### 이벤트 타입과 래퍼

`TrueAsync`의 각 이벤트는 이중 특성을 갖습니다: `PHP` 코어에서 정의된 `ABI` 구조체와
실제로 `OS`와 상호작용하는 `libuv handle`. `Reactor`는 이 둘을 "접착"하여
두 세계가 공존하는 래퍼를 생성합니다:

| 이벤트 타입    | ABI 구조체                        | libuv handle                  |
|----------------|-----------------------------------|-------------------------------|
| Poll (fd/소켓) | `zend_async_poll_event_t`         | `uv_poll_t`                   |
| 타이머         | `zend_async_timer_event_t`        | `uv_timer_t`                  |
| 시그널         | `zend_async_signal_event_t`       | 전역 `uv_signal_t`            |
| 파일시스템     | `zend_async_filesystem_event_t`   | `uv_fs_event_t`               |
| DNS            | `zend_async_dns_addrinfo_t`       | `uv_getaddrinfo_t`            |
| 프로세스       | `zend_async_process_event_t`      | `HANDLE` (Win) / `waitpid`    |
| 스레드         | `zend_async_thread_event_t`       | `uv_thread_t`                 |
| Exec           | `zend_async_exec_event_t`         | `uv_process_t` + `uv_pipe_t` |
| 트리거         | `zend_async_trigger_event_t`      | `uv_async_t`                  |

이벤트 구조에 대한 자세한 내용은 [이벤트와 이벤트 모델](/ko/architecture/events.html)을 참조하세요.

### 비동기 IO

스트림 연산에는 통합 `async_io_t`가 사용됩니다:

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI: event + fd/socket + type + state
    int crt_fd;             // CRT 파일 디스크립터
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

동일한 인터페이스(`ZEND_ASYNC_IO_READ/WRITE/CLOSE`)가 `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`에서 작동합니다.
구체적인 구현은 `type`에 따라 핸들 생성 시 선택됩니다.

### 리액터 루프

`reactor_execute(no_wait)`는 `libuv` `event loop`의 한 틱을 호출합니다:
- `no_wait = true` -- 논블로킹 호출, 준비된 이벤트만 처리
- `no_wait = false` -- 다음 이벤트까지 블로킹

`Scheduler`는 두 모드를 모두 사용합니다. 코루틴 전환 사이에는 -- 이미 발생한 이벤트를
수집하기 위한 논블로킹 틱. 코루틴 큐가 비어 있을 때는 --
유휴 루프에서 CPU를 낭비하지 않기 위한 블로킹 호출.

이것은 이벤트 기반 서버 세계의 고전적인 전략입니다: `nginx`, `Node.js`,
`Tokio`가 같은 원칙을 사용합니다: 할 일이 있으면 대기 없이 폴링하고,
할 일이 없으면 슬립합니다.

## 전환 효율성: 산업 맥락에서의 TrueAsync

### Stackful vs Stackless: 두 세계

코루틴 구현에는 근본적으로 다른 두 가지 접근 방식이 있습니다:

**Stackful** (Go, Erlang, Java Loom, PHP Fiber) -- 각 코루틴이 자체 C 스택을 갖습니다.
전환은 레지스터와 스택 포인터의 저장/복원을 포함합니다.
주요 장점: **투명성**. 모든 호출 깊이의 어떤 함수든 특별한 어노테이션 없이
`suspend`를 호출할 수 있습니다. 프로그래머는 일반적인 동기 코드를 작성합니다.

**Stackless** (Rust async/await, Kotlin, C# async) -- 컴파일러가 `async` 함수를
상태 머신으로 변환합니다. "일시 중단"은 함수로부터의 `return`에 불과하고,
"재개"는 새로운 상태 번호로의 메서드 호출입니다. 스택은 전혀 전환되지 않습니다.
비용: **"함수 색칠"** (`async`가 전체 호출 체인에 전파됩니다).

| 속성                                    | Stackful                          | Stackless                         |
|-------------------------------------------|-----------------------------------|-----------------------------------|
| 중첩 호출에서의 일시 중단                 | 예                                | 아니오 -- `async` 함수에서만      |
| 전환 비용                                 | 15-200 ns (레지스터 저장)         | 10-50 ns (객체에 필드 쓰기)       |
| 코루틴당 메모리                           | 4-64 KiB (별도 스택)              | 정확한 상태 머신 크기             |
| yield를 통한 컴파일러 최적화              | 불가능 (스택이 불투명)            | 가능 (inline, HALO)               |

`PHP 코루틴`은 `Boost.Context fcontext_t` 기반의 **stackful** 코루틴입니다.

### 아키텍처 트레이드오프

`TrueAsync`는 **stackful 싱글 스레드** 모델을 선택합니다:

- **Stackful** -- `PHP` 생태계가 방대하고, 수백만 줄의
  기존 코드에 `async`를 "색칠"하는 것은 비용이 큽니다. Stackful 코루틴은 일반 C 함수 사용을 허용하며, 이는 PHP의 중요한 요구사항입니다.
- **싱글 스레드** -- PHP는 역사적으로 싱글 스레드입니다 (공유 가변 상태 없음),
  이 속성은 결과를 처리하는 것보다 보존하기가 더 쉽습니다.
  스레드는 `CPU-bound` 태스크를 위한 `ThreadPool`에서만 나타납니다.

`TrueAsync`는 현재 저수준 `Fiber API`를 재사용하므로,
컨텍스트 전환 비용은 비교적 높으며 향후 개선될 수 있습니다.

## 그레이스풀 셧다운

`PHP` 스크립트는 언제든지 종료될 수 있습니다: 처리되지 않은 예외, `exit()`,
OS 시그널. 그러나 비동기 세계에서는 수십 개의 코루틴이 열린 연결,
쓰여지지 않은 버퍼, 커밋되지 않은 트랜잭션을 보유하고 있을 수 있습니다.

`TrueAsync`는 제어된 셧다운을 통해 이를 처리합니다:

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- 플래그 설정
2. 모든 코루틴이 `CancellationException`을 받습니다
3. 코루틴은 `finally` 블록을 실행할 기회를 얻습니다 -- 연결 닫기, 버퍼 플러시
4. `finally_shutdown()` -- 남은 코루틴과 마이크로태스크의 최종 정리
5. 리액터가 중지됩니다

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
