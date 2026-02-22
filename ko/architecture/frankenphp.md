---
layout: architecture
lang: ko
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /ko/architecture/frankenphp.html
page_title: "FrankenPHP 통합"
description: "TrueAsync가 FrankenPHP를 완전한 비동기 서버로 전환하는 방법 -- 요청당 코루틴, 제로카피 응답, 이중 알림 경로."
---

# TrueAsync + FrankenPHP: 많은 요청, 하나의 스레드

이 글에서는 `FrankenPHP`와 `TrueAsync`의 통합 경험을 살펴봅니다.
`FrankenPHP`는 `Go` 프로세스 내에서 `PHP` 코드를 실행하는 `Caddy` 기반 서버입니다.
우리는 `FrankenPHP`에 `TrueAsync` 지원을 추가하여, 각 `PHP` 스레드가
오케스트레이션을 위한 `TrueAsync` 코루틴을 사용해 여러 요청을 동시에 처리할 수 있게 했습니다.

## FrankenPHP의 동작 방식

`FrankenPHP`는 `Go` 세계(`Caddy`)와 `PHP`를 하나로 묶는 프로세스입니다.
`Go`가 프로세스를 소유하고, `PHP`는 `Go`가 `SAPI`를 통해 상호작용하는 "플러그인" 역할을 합니다.
이를 위해 `PHP` 가상 머신은 별도의 스레드에서 실행됩니다. `Go`가 이 스레드들을 생성하고
`SAPI` 함수를 호출하여 `PHP` 코드를 실행합니다.

각 요청마다 `Caddy`는 HTTP 요청을 처리하는 별도의 고루틴을 생성합니다.
고루틴은 풀에서 여유 `PHP` 스레드를 선택하고 채널을 통해 요청 데이터를 보낸 후
대기 상태에 들어갑니다.

`PHP`가 응답 형성을 완료하면, 고루틴은 채널을 통해 응답을 받아 `Caddy`에 전달합니다.

우리는 이 접근 방식을 변경하여 고루틴이 같은 `PHP` 스레드에 여러 요청을 보내고,
`PHP` 스레드가 이러한 요청을 비동기적으로 처리하는 방법을 배우도록 했습니다.

### 전체 아키텍처

![전체 FrankenPHP + TrueAsync 아키텍처](/diagrams/ko/architecture-frankenphp/architecture.svg)

이 다이어그램은 세 개의 레이어를 보여줍니다. 각각을 살펴보겠습니다.

### Go를 TrueAsync 스케줄러에 통합

애플리케이션이 동작하려면 PHP `Reactor`와 `Scheduler`가 `Caddy`와 통합되어야 합니다.
따라서 `Go`와 `PHP` 세계 모두에서 호환되는
크로스 스레드 통신 메커니즘이 필요합니다. `Go` 채널은 스레드 간 데이터 전송에 탁월하며
`C-Go`에서 접근 가능합니다. 하지만 `EventLoop` 사이클이 슬립 상태에 들어갈 수 있으므로 충분하지 않습니다.

거의 모든 웹 서버에서 찾을 수 있는 오래된 잘 알려진 접근 방식이 있습니다:
전송 채널과 `fdevent`의 조합입니다 (macOS/Windows에서는 `pipe`가 사용됩니다).

채널이 비어 있지 않으면 `PHP`가 읽고 있을 것이므로 다른 값을 추가하면 됩니다.
채널이 비어 있으면 `PHP` 스레드가 슬립 중이며 깨워야 합니다. 이것이 `Notify()`의 역할입니다.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- 가장 빠른 옵션
        // ...
    }
    // 폴백: macOS/BSD용 pipe
    syscall.Pipe(fds[:])
}
```

`PHP` 측에서는 `eventfd` 디스크립터가 `Reactor`에 등록됩니다:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

`Reactor`(`libuv` 기반)가 디스크립터를 모니터링하기 시작합니다. `Go`가
`eventfd`에 쓰면, `Reactor`가 깨어나 요청 처리 콜백을 호출합니다.

이제 고루틴이 요청 데이터를 `contextHolder` 구조체로 패키징하여
`PHP` 스레드로 전달하기 위해 `Dispatcher`에 전달합니다.
`Dispatcher`는 라운드 로빈 방식으로 `PHP` 스레드를 순환하며
특정 스레드에 바인딩된 버퍼드 `Go` 채널(`requestChan`)에
요청 컨텍스트를 보내려고 시도합니다.
버퍼가 가득 차면 `Dispatcher`는 다음 스레드를 시도합니다.
모두 바쁘면 -- 클라이언트는 `HTTP 503`을 받습니다.

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### 스케줄러와의 통합

`FrankenPHP`가 초기화되고 `PHP` 스레드를 생성할 때,
`True Async ABI`(`zend_async_API.h`)를 사용하여 `Reactor`/`Scheduler`와 통합합니다.

`frankenphp_enter_async_mode()` 함수가 이 프로세스를 담당하며, `PHP` 스크립트가
`HttpServer::onRequest()`를 통해 콜백을 등록할 때 한 번 호출됩니다:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Go에서 알림 FD 가져오기
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Reactor에 FD 등록 (느린 경로)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. 스케줄러 시작
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. 하트비트 핸들러 교체 (빠른 경로)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. 메인 코루틴 일시 중단
    frankenphp_suspend_main_coroutine();

    // --- 셧다운 시에만 여기에 도달 ---

    // 6. 하트비트 핸들러 복원
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. 리소스 해제
    close_request_event();
}
```

각 `Scheduler` 틱에 자체 핸들러를 추가하기 위해 `heartbeat handler`를 사용합니다.
이는 `Scheduler`의 특별한 콜백입니다. 이 핸들러를 통해 `FrankenPHP`는
요청 처리를 위한 새로운 코루틴을 생성할 수 있습니다.

![이중 알림 시스템](/diagrams/ko/architecture-frankenphp/notification.svg)

이제 `Scheduler`가 매 틱마다 `heartbeat handler`를 호출합니다. 이 핸들러는
`CGo`를 통해 `Go` 채널을 확인합니다:

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

시스템 호출 없이, `epoll_wait` 없이, `CGo`를 통한 `Go` 함수의 직접 호출.
채널이 비어 있으면 즉시 반환됩니다.
`heartbeat handler`의 필수 요건인 가장 저렴한 연산입니다.

모든 코루틴이 슬립 중이면 `Scheduler`가 `Reactor`에 제어를 넘기고
`heartbeat`는 틱을 멈춥니다. 그러면 `AsyncNotifier`가 작동합니다:
`Reactor`는 `epoll`/`kqueue`에서 대기하며 `Go`가 디스크립터에 쓸 때 깨어납니다.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

두 시스템은 서로 보완합니다: `heartbeat`는 부하 시 최소 지연 시간을 제공하고,
`poll event`는 유휴 시 `CPU` 소비 제로를 보장합니다.

### 요청 코루틴 생성

`frankenphp_request_coroutine_entry()` 함수가 요청 처리 코루틴 생성을 담당합니다:

![요청 생명주기](/diagrams/ko/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

각 요청마다 **별도의 `Scope`**가 생성됩니다. 이는
코루틴과 리소스의 생명주기를 제어할 수 있는 격리된 컨텍스트입니다.
`Scope`가 완료되면 그 안의 모든 코루틴이 취소됩니다.

### PHP 코드와의 상호작용

코루틴을 생성하려면 `FrankenPHP`가 핸들러 함수를 알아야 합니다.
핸들러 함수는 PHP 프로그래머가 정의해야 합니다.
이를 위해 `PHP` 측의 초기화 코드가 필요합니다. `HttpServer::onRequest()` 함수가
이 초기화 역할을 하며, `HTTP` 요청 처리를 위한 `PHP` 콜백을 등록합니다.

`PHP` 측에서는 모든 것이 간단하게 보입니다:

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

초기화는 메인 코루틴에서 발생합니다.
프로그래머는 `HttpServer` 객체를 생성하고, `onRequest()`를 호출하고, 명시적으로 서버를 "시작"해야 합니다.
그 후 `FrankenPHP`가 제어를 넘겨받고 서버가 셧다운될 때까지 메인 코루틴을 차단합니다.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // 항상 false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

`Caddy`에 결과를 보내려면 `PHP` 코드에서 `Response` 객체를 사용합니다.
이 객체는 `write()`와 `end()` 메서드를 제공합니다.
내부적으로 메모리가 복사되고 결과가 채널로 전송됩니다.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## 소스 코드

통합 리포지토리는 `true-async` 브랜치가 있는 `FrankenPHP`의 포크입니다:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- 통합 리포지토리

주요 파일:

| 파일                                                                                                        | 설명                                                                        |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | `Scheduler`/`Reactor` 통합: heartbeat, poll event, 코루틴 생성              |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP 클래스 `HttpServer`, `Request`, `Response`                               |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Go 측: `round-robin`, `requestChan`, `responseChan`, `CGo` 내보내기          |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | 통합 문서                                                                    |

통합에서 사용하는 TrueAsync ABI:

| 파일                                                                                                     | 설명                                              |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | API 정의: 매크로, 함수 포인터, 타입               |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | 인프라: 등록, 스텁 구현                            |
