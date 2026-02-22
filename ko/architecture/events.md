---
layout: architecture
lang: ko
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /ko/architecture/events.html
page_title: "이벤트와 이벤트 모델"
description: "기본 zend_async_event_t 구조체 -- 모든 비동기 연산의 기반, 콜백 시스템, 플래그, 이벤트 계층구조."
---

# 이벤트와 이벤트 모델

이벤트(`zend_async_event_t`)는 **모든** 비동기 프리미티브가 상속하는
범용 구조체입니다:
코루틴, `future`, 채널, 타이머, `poll` 이벤트, 시그널 등.

통합된 이벤트 인터페이스를 통해 다음이 가능합니다:
- 콜백을 통한 모든 이벤트 구독
- 단일 대기에서 이기종 이벤트의 결합
- 참조 카운팅을 통한 생명주기 관리

## 기본 구조체

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // 추가 데이터에 대한 오프셋

    union {
        uint32_t ref_count;          // C 객체용
        uint32_t zend_object_offset; // Zend 객체용
    };

    uint32_t loop_ref_count;         // 이벤트 루프 참조 카운트

    zend_async_callbacks_vector_t callbacks;

    // 메서드
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### 이벤트의 가상 메서드

각 이벤트는 작은 가상 메서드 세트를 가집니다.

| 메서드           | 용도                                               |
|------------------|----------------------------------------------------|
| `add_callback`   | 이벤트에 콜백 구독                                 |
| `del_callback`   | 콜백 구독 해제                                     |
| `start`          | 리액터에서 이벤트 활성화                           |
| `stop`           | 이벤트 비활성화                                    |
| `replay`         | 결과 재전달 (future, 코루틴용)                     |
| `dispose`        | 리소스 해제                                        |
| `info`           | 이벤트의 텍스트 설명 (디버깅용)                    |
| `notify_handler` | 콜백 알림 전에 호출되는 훅                         |

#### `add_callback`

이벤트의 동적 `callbacks` 배열에 콜백을 추가합니다.
`zend_async_callbacks_push()`를 호출하여
콜백의 `ref_count`를 증가시키고 벡터에 포인터를 추가합니다.

#### `del_callback`

벡터에서 콜백을 제거하고 (마지막 요소와 교환하여 O(1))
`callback->dispose`를 호출합니다.

일반적인 시나리오: 여러 이벤트에 대한 `select` 대기 중
하나가 발생하면, 다른 이벤트들은 `del_callback`을 통해 구독 해제됩니다.

#### `start`

`start`와 `stop` 메서드는 `EventLoop`에 배치될 수 있는 이벤트를 위한 것입니다.
따라서 모든 프리미티브가 이 메서드를 구현하는 것은 아닙니다.

EventLoop 이벤트의 경우, `start`는 `loop_ref_count`를 증가시켜
이벤트가 필요한 동안 EventLoop에 남아있을 수 있게 합니다.

| 타입                                           | `start`의 동작                                                           |
|------------------------------------------------|--------------------------------------------------------------------------|
| 코루틴, `Future`, `Channel`, `Pool`, `Scope`   | 아무것도 하지 않음                                                       |
| 타이머                                         | `uv_timer_start()` + `loop_ref_count` 및 `active_event_count` 증가       |
| Poll                                           | 이벤트 마스크(READABLE/WRITABLE)와 함께 `uv_poll_start()`               |
| 시그널                                         | 전역 시그널 테이블에 이벤트 등록                                         |
| IO                                             | `loop_ref_count` 증가 -- libuv 스트림은 read/write를 통해 시작           |

#### `stop`

`start`의 반대 메서드입니다. EventLoop 타입 이벤트의 `loop_ref_count`를 감소시킵니다.
마지막 `stop` 호출(`loop_ref_count`가 0에 도달)이 실제로 `handle`을 중지합니다.

#### `replay`

이미 완료된 이벤트의 결과를 늦은 구독자에게 전달할 수 있게 합니다.
결과를 저장하는 타입만 구현합니다.

| 타입         | `replay`가 반환하는 것                           |
|--------------|--------------------------------------------------|
| **코루틴**   | `coroutine->result` 및/또는 `coroutine->exception` |
| **Future**   | `future->result` 및/또는 `future->exception`      |

`callback`이 제공되면 결과와 함께 동기적으로 호출됩니다.
`result`/`exception`이 제공되면 값이 포인터로 복사됩니다.
`replay` 없이 닫힌 이벤트를 대기하면 경고가 발생합니다.

#### `dispose`

이 메서드는 `ref_count`를 감소시켜 이벤트를 해제하려고 시도합니다.
카운트가 0에 도달하면 실제 리소스 해제가 트리거됩니다.

#### `info`

디버깅 및 로깅을 위한 사람이 읽을 수 있는 문자열입니다.

| 타입                 | 예시 문자열                                                              |
|----------------------|--------------------------------------------------------------------------|
| **코루틴**           | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` 또는 `"FutureState(pending)"`                 |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

콜백이 결과를 받기 **전에** 알림을 가로채는 훅입니다.
기본적으로 모든 이벤트에서 `NULL`입니다. `Async\Timeout`에서 사용됩니다:

## 이벤트 생명주기

![이벤트 생명주기](/diagrams/ko/architecture-events/lifecycle.svg)

이벤트는 여러 상태를 거칩니다:
- **Created** -- 메모리 할당, `ref_count = 1`, 콜백 구독 가능
- **Active** -- `EventLoop`에 등록(`start()`), `active_event_count` 증가
- **Fired** -- `libuv`가 콜백을 호출함. 주기적 이벤트(타이머, poll)의 경우 -- **Active**로 복귀. 일회성 이벤트(DNS, exec, Future)의 경우 -- **Closed**로 전환
- **Stopped** -- `EventLoop`에서 일시적으로 제거(`stop()`), 재활성화 가능
- **Closed** -- `flags |= F_CLOSED`, 구독 불가, `ref_count = 0`에 도달하면 `dispose` 호출

## 상호작용: 이벤트, 콜백, 코루틴

![이벤트 -> 콜백 -> 코루틴](/diagrams/ko/architecture-events/callback-flow.svg)

## 이중 생명: C 객체와 Zend 객체

이벤트는 종종 두 세계에 동시에 존재합니다.
타이머, `poll` 핸들, `DNS` 쿼리는 `Reactor`가 관리하는 내부 `C` 객체입니다.
하지만 코루틴이나 `Future`는 사용자 코드에서 접근 가능한 `PHP` 객체이기도 합니다.

`EventLoop`의 C 구조체는 이를 참조하는 `PHP` 객체보다 오래 살 수 있으며, 그 반대도 마찬가지입니다.
C 객체는 `ref_count`를 사용하고, `PHP` 객체는
가비지 컬렉터와 함께 `GC_ADDREF/GC_DELREF`를 사용합니다.

따라서 `TrueAsync`는 PHP 객체와 C 객체 간의 여러 유형의 바인딩을 지원합니다.

### C 객체

PHP 코드에서 보이지 않는 내부 이벤트는 `ref_count` 필드를 사용합니다.
마지막 소유자가 참조를 해제하면 `dispose`가 호출됩니다:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + 0 도달 시 dispose
```

### Zend 객체

코루틴은 `Awaitable` 인터페이스를 구현하는 `PHP` 객체입니다.
`ref_count` 대신 `zend_object` 구조체의 오프셋을 가리키는
`zend_object_offset` 필드를 사용합니다.

`ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` 매크로는 모든 경우에서 올바르게 동작합니다.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

`zend_object`는 이벤트의 C 구조체의 일부이며
`ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`를 사용하여 복구할 수 있습니다.

```c
// PHP 객체에서 이벤트 가져오기 (이벤트 참조 고려)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// 이벤트에서 PHP 객체 가져오기
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## 이벤트 참조

일부 이벤트는 아키텍처적 문제에 직면합니다: 직접 `Zend` 객체가 될 수 없습니다.

예를 들어 타이머가 있습니다. `PHP GC`는 언제든지 객체를 수집하기로 결정할 수 있지만, `libuv`는
콜백을 통한 비동기 핸들 클로저(`uv_close()`)를 요구합니다. `GC`가 소멸자를 호출할 때
`libuv`가 핸들 작업을 완료하지 않았다면, `use-after-free`가 발생합니다.

이 경우 **이벤트 참조** 접근 방식이 사용됩니다: `PHP` 객체는 이벤트 자체가 아니라 이벤트에 대한 포인터를 저장합니다:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // 실제 이벤트에 대한 포인터
} zend_async_event_ref_t;
```

이 접근 방식을 사용하면 `PHP` 객체와 C 이벤트의 수명이 **독립적**입니다.
`PHP` 객체는 `handle`에 영향을 주지 않고 `GC`에 의해 수집될 수 있으며,
`handle`은 준비되면 비동기적으로 닫힙니다.

`ZEND_ASYNC_OBJECT_TO_EVENT()` 매크로는 `flags` 접두사로 참조를 자동으로 인식하고
포인터를 따라갑니다.

## 콜백 시스템

이벤트 구독은 코루틴과 외부 세계 간의 주요 상호작용 메커니즘입니다.
코루틴이 타이머, 소켓의 데이터, 또는 다른 코루틴의 완료를 기다리고자 할 때,
해당 이벤트에 `callback`을 등록합니다.

각 이벤트는 구독자의 동적 배열을 저장합니다:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // 활성 반복자 인덱스에 대한 포인터 (또는 NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator`는 반복 중 콜백을 안전하게 제거하는 문제를 해결합니다.

### 콜백 구조체

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

콜백도 참조 카운팅 구조체입니다. 이는 하나의 `callback`이
이벤트의 벡터와 코루틴의 `waker`에 의해 동시에 참조될 수 있기 때문입니다.
`ref_count`는 양쪽이 모두 참조를 해제할 때만 메모리가 해제되도록 보장합니다.

### 코루틴 콜백

`TrueAsync`의 대부분의 콜백은 코루틴을 깨우는 데 사용됩니다.
따라서 코루틴과 구독한 이벤트에 대한 정보를 저장합니다:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // 상속
    zend_coroutine_t *coroutine;         // 깨울 대상
    zend_async_event_t *event;           // 출처
};
```

이 바인딩은 [Waker](/ko/architecture/waker.html) 메커니즘의 기반입니다:

## 이벤트 플래그

`flags` 필드의 비트 플래그는 생명주기의 모든 단계에서 이벤트의 동작을 제어합니다:

| 플래그                | 용도                                                                     |
|-----------------------|--------------------------------------------------------------------------|
| `F_CLOSED`            | 이벤트 완료. `start`/`stop`이 더 이상 작동하지 않으며, 구독 불가          |
| `F_RESULT_USED`       | 누군가 결과를 대기 중 -- 미사용 결과 경고 불필요                          |
| `F_EXC_CAUGHT`        | 오류가 캐치됨 -- 처리되지 않은 예외 경고 억제                             |
| `F_ZVAL_RESULT`       | 콜백의 결과가 `zval`에 대한 포인터 (`void*`가 아님)                       |
| `F_ZEND_OBJ`          | 이벤트가 `Zend` 객체 -- `ref_count`를 `GC_ADDREF`로 전환                  |
| `F_NO_FREE_MEMORY`    | `dispose`가 메모리를 해제하지 않아야 함 (`emalloc`으로 할당되지 않은 객체) |
| `F_EXCEPTION_HANDLED` | 예외가 처리됨 -- 다시 던질 필요 없음                                      |
| `F_REFERENCE`         | 구조체가 실제 이벤트가 아닌 `이벤트 참조`                                 |
| `F_OBJ_REF`           | `extra_offset`에 `zend_object`에 대한 포인터가 있음                       |
| `F_CLOSE_FD`          | 소멸 시 파일 디스크립터 닫기                                              |
| `F_HIDDEN`            | 숨겨진 이벤트 -- `데드락 감지`에 참여하지 않음                            |

### 데드락 감지

`TrueAsync`는 `active_event_count`를 통해 `EventLoop`의 활성 이벤트 수를 추적합니다.
모든 코루틴이 일시 중단되고 활성 이벤트가 없을 때 -- 이것이 `데드락`입니다:
어떤 이벤트도 코루틴을 깨울 수 없습니다.

그러나 일부 이벤트는 항상 `EventLoop`에 존재하며 사용자 로직과 무관합니다:
백그라운드 `healthcheck` 타이머, 시스템 핸들러. 이들이 "활성"으로 카운트되면,
`데드락 감지`가 절대 트리거되지 않습니다.

이러한 이벤트에는 `F_HIDDEN` 플래그가 사용됩니다:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // 숨김으로 표시
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, 단 숨겨진 것이 아닐 때만
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, 단 숨겨진 것이 아닐 때만
```

## 이벤트 계층구조

`C`에는 클래스 상속이 없지만, 기법이 있습니다: 구조체의 첫 번째 필드가
`zend_async_event_t`이면, 구조체에 대한 포인터를
`zend_async_event_t`에 대한 포인터로 안전하게 캐스팅할 수 있습니다. 이것이 바로 모든 특수화된 이벤트가
기본 이벤트를 "상속"하는 방식입니다:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- fd/소켓 폴링
|   \-- zend_async_poll_proxy_t  -- 이벤트 필터링을 위한 프록시
|-- zend_async_timer_event_t     -- 타이머 (일회성 및 주기적)
|-- zend_async_signal_event_t    -- POSIX 시그널
|-- zend_async_process_event_t   -- 프로세스 종료 대기
|-- zend_async_thread_event_t    -- 백그라운드 스레드
|-- zend_async_filesystem_event_t -- 파일시스템 변경
|-- zend_async_dns_nameinfo_t    -- 역방향 DNS
|-- zend_async_dns_addrinfo_t    -- DNS 해석
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- TCP 서버 소켓
|-- zend_async_trigger_event_t   -- 수동 깨우기 (크로스 스레드 안전)
|-- zend_async_task_t            -- 스레드 풀 태스크
|-- zend_async_io_t              -- 통합 I/O
|-- zend_coroutine_t             -- 코루틴
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- 채널
|-- zend_async_group_t           -- 태스크 그룹
|-- zend_async_pool_t            -- 리소스 풀
\-- zend_async_scope_t           -- 스코프
```

이 덕분에 `Waker`는 구체적인 타입을 알 필요 없이
동일한 `event->add_callback` 호출로 이러한 이벤트 **중 어느 것에든** 구독할 수 있습니다.

### 특수화된 구조체의 예시

각 구조체는 기본 이벤트에 해당 타입에
고유한 필드만 추가합니다:

**타이머** -- 최소 확장:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // 밀리초
    bool is_periodic;
};
```

**Poll** -- 디스크립터에 대한 I/O 추적:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // 추적 대상: READABLE|WRITABLE|...
    async_poll_event triggered_events; // 실제로 발생한 것
};
```

**파일시스템** -- 파일시스템 모니터링:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // 변경된 파일
};
```

**Exec** -- 외부 명령 실행:
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll 프록시

상황을 상상해보세요: 하나의 TCP 소켓에 두 개의 코루틴 -- 하나는 읽기, 다른 하나는 쓰기.
서로 다른 이벤트(`READABLE` vs `WRITABLE`)가 필요하지만, 소켓은 하나입니다.

`Poll 프록시`가 이 문제를 해결합니다. 같은 fd에 두 개의 `uv_poll_t` 핸들을 생성하는 대신
(`libuv`에서는 불가능), 하나의 `poll_event`와
서로 다른 마스크를 가진 여러 프록시가 생성됩니다:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // 부모 poll
    async_poll_event events;               // 이 프록시의 이벤트 하위 집합
    async_poll_event triggered_events;     // 발생한 것
};
```

`Reactor`는 모든 활성 프록시의 마스크를 집계하여 결합된 마스크를 `uv_poll_start`에 전달합니다.
`libuv`가 이벤트를 보고하면, `Reactor`는 각 프록시를 확인하고
마스크가 일치하는 것만 알립니다.

## 비동기 IO

스트림 I/O 연산(파일에서 읽기, 소켓에 쓰기, 파이프 작업)을 위해
`TrueAsync`는 통합된 `handle`을 제공합니다:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // PIPE/FILE용
        zend_socket_t socket;        // TCP/UDP용
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

동일한 `ZEND_ASYNC_IO_READ/WRITE/CLOSE` 인터페이스가 모든 타입에서 작동하며,
구체적인 구현은 `type`에 따라 `handle` 생성 시 선택됩니다.

모든 I/O 연산은 비동기적이며 `zend_async_io_req_t` -- 일회성 요청을 반환합니다:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // 연산 오류 (또는 NULL)
    char *buf;                 // 데이터 버퍼
    bool completed;            // 연산 완료?
    void (*dispose)(zend_async_io_req_t *req);
};
```

코루틴이 `ZEND_ASYNC_IO_READ`를 호출하면 `req`를 받고,
`Waker`를 통해 완료를 구독한 다음 대기 상태에 들어갑니다.
`libuv`가 연산을 완료하면 `req->completed`가 `true`가 되고,
콜백이 코루틴을 깨우면 `req->buf`에서 데이터를 가져옵니다.
