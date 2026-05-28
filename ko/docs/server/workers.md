---
layout: docs
lang: ko
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /ko/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker와 bootloader"
description: "setWorkers(N): Async\\ThreadPool 기반 내장 스레드 풀. Bootloader, SO_REUSEPORT, 요청별 scope, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server는 기본적으로 **단일 스레드** 모드로 동작합니다: 하나의 event-loop, 하나의 스레드,
전체 파이프라인(accept → parse → dispatch → respond)이 하나의 CPU에서 실행됩니다. 일반적인
IO-bound 부하에 가장 빠른 모델이지만 코어 단위로 확장되지 않습니다.

`setWorkers(N)`은 [`Async\ThreadPool`](/ko/docs/components/thread-pool.html)을 통해 N개의
OS 스레드로 구성된 내장 풀을 띄웁니다. 각 워커는 같은 리스너에 다시 바인드되며, 커널(Linux/BSD)이
`SO_REUSEPORT`로 accept를 분산합니다. 각 워커는 독립적인 event-loop, 독립적인 opcache,
독립적인 커넥션 풀을 가집니다.

## 기본 예제

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid(), 'tid' => /* TID */]);
});

$server->start();   // 모든 워커가 끝날 때까지 블로킹
```

부모에서의 `HttpServer::start()`:

1. 필요한 크기의 `Async\ThreadPool`을 spawn합니다.
2. `transfer_obj`로 config와 핸들러 세트를 각 워커에 복사합니다.
3. 워커 안에서 event-loop를 시작하고 리스너를 다시 바인드합니다.
4. 부모가 모든 워커의 종료를 `await`합니다.

cross-thread `stop()`은 아직 로드맵에 있습니다. 중단은 SIGINT/SIGTERM 또는 정상적인 작업 종료를
통해 동작합니다.

## Bootloader

워커의 무거운 초기화(autoload, 풀 워밍, JIT 워밍업)는 매 요청이 아니라 시작 시 **한 번** 수행되어야
합니다. 이를 위해 `setBootloader(?\Closure $cb)`가 있습니다.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // task loop 전에 각 워커에서 한 번 실행됨
        require __DIR__ . '/vendor/autoload.php';

        // 커넥션 풀 워밍
        Database::initPool(min: 4, max: 16);

        // 핵심 라우트 사전 컴파일
        Router::compile();
    });
```

클로저는 한 번 deep-copy되며 각 워커에서 task를 받아들이기 전에 실행됩니다.
**bootloader에서 던져진 예외는 전체 풀을 실패시킵니다**: 워커가 시작하지 않습니다.

`setWorkers() > 1`일 때만 적용됩니다. `null`은 bootloader를 제거합니다.

> TrueAsync ABI v0.15+가 필요합니다. 테스트: `server/core/021-bootloader.phpt`.

## 요청별 scope

0.6.5부터 각 핸들러 코루틴은 서버 scope의 자식인 **자체 scope**에서 실행됩니다. 이로 인해 두 가지
중요한 시맨틱이 생깁니다.

- [`Async\request_context()`](/ko/docs/reference/request-context.html) — 요청의 전체 코루틴
  트리(핸들러와 자식 `spawn`)에서 공유되는 컨텍스트.
- [`Async\current_context()`](/ko/docs/reference/current-context.html)는 여전히 per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // 요청의 코루틴 가지 전체가 컨텍스트를 봄
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // 여기서도 request_id가 보임
        spawn(fn() => fetchPosts()),  // 여기서도
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

비교: `current_context()`는 **현재 코루틴에서만** 보이는 값을 만듭니다.
`request_context()`는 요청 scope에 묶인 공유 서브트리를 제공합니다.

## SO_REUSEPORT와 부하 분산

Linux/BSD에서 커널은 같은 `(host, port)`에 `SO_REUSEPORT`로 열린 모든 소켓에 들어오는 연결을
균등하게(하지만 비결정적으로) 분산합니다. 각 워커는 자신의 소켓을 엽니다.
userspace 로드 밸런서가 필요 없고, 락도 없습니다.

Windows에서는 `SO_REUSEPORT` 등가물이 덜 예측 가능합니다. 부하 분산을 더 위(LB)로 옮기거나,
서로 다른 포트의 단일 워커 + N 프로세스를 사용하세요.

## 핸들러의 cross-thread transfer

구성을 한 스레드에서 만들고 다른 스레드에서 서버를 시작하는 경우 `HttpServer`는 transfer를 지원합니다.
0.2.0부터 transfer 경로는 프로토콜 마스크를 올바르게 옮깁니다 ("모든 요청이 조용히 누락"되는 버그가
수정됨. CHANGELOG의 `core/007-server-transfer-handler-dispatch.phpt` 참고).

## 멀티스레드 모드 디버깅

0.6.3에서 예기치 않은 워커 종료에 대한 loud 로깅이 추가되었습니다. `$server->start()`에서 잡히지
않은 예외와 await-loop가 아직 워커를 기다리는 동안의 clean return이 stderr에 표시됩니다
(이전에는 각 케이스가 1/N accept 용량을 운영자에게 신호 없이 조용히 떨어뜨렸습니다).

INFO 로깅을 켜세요.

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## 워커 수는?

경험 법칙:

- **IO-bound** (DB/HTTP가 있는 일반 web): `available_parallelism()`로 시작하고 CPU util을 관찰.
- **CPU-bound** (렌더링, 압축 위주, 큰 JSON): `available_parallelism()` 또는 그 이하,
  p99 latency를 관찰.
- **Mixed**: 1–2개 워커 오버커밋(`N+1` 또는 `N+2`)이 IO-stall 시 더 나은 코어 활용을 줄 때가 많음.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()`은 프로세스가 사용할 수 있는 CPU 수를 반환합니다 (cgroup quota와
> affinity 고려). `uv_available_parallelism`이 백엔드이고 `uv_cpu_info` 폴백.

## 참고

- [`HttpServerConfig::setWorkers()`](/ko/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/ko/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/ko/docs/components/thread-pool.html): 풀 내부
- [`Async\request_context()`](/ko/docs/reference/request-context.html)
- [Backpressure / drain](/ko/docs/server/configuration.html#graceful-drain-step-8)
