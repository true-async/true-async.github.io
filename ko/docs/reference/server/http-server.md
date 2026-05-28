---
layout: docs
lang: ko
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /ko/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — 내장 HTTP 서버의 메인 클래스. 핸들러 등록, 시작/중지, 텔레메트리, 런타임 통계."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

내장 서버의 메인 클래스입니다. 생성자로 구성을 받고, 프로토콜 핸들러를 등록하며, `start()`로
실행되어 `stop()`까지 스레드를 블로킹합니다.

```php
namespace TrueAsync;

final class HttpServer
{
    public function __construct(HttpServerConfig $config);

    public function addHttpHandler(callable $handler): static;
    public function addStaticHandler(StaticHandler $handler): static;
    public function addWebSocketHandler(callable $handler): static;   // TODO
    public function addHttp2Handler(callable $handler): static;       // TODO
    public function addGrpcHandler(callable $handler): static;        // TODO

    public function start(): bool;
    public function stop(): bool;
    public function isRunning(): bool;

    public function getConfig(): HttpServerConfig;
    public function getHttp3Stats(): array;
    public function getRuntimeStats(): array;
    public function getTelemetry(): array;        // TODO
    public function resetTelemetry(): bool;       // TODO
}
```

## 메서드

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

주어진 구성으로 서버를 생성합니다. 이 호출에서 **구성이 고정**됩니다 — 이후의 setter는
`HttpServerRuntimeException`을 던집니다.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

HTTP/1.1과 HTTP/2 요청 핸들러를 등록합니다. 시그니처:

```php
function (HttpRequest $request, HttpResponse $response): void
```

각 요청은 [요청별 scope](/ko/docs/server/workers.html#요청별-scope)에서 **자체 코루틴**으로
실행됩니다. 핸들러는 `void`를 반환하고, 응답은 `$response`로 전송합니다.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

정적 mount를 등록합니다 (issue #13). `$handler->getUrlPrefix()` 아래의 요청은 **완전히 C에서**
처리됩니다 — 코루틴 spawn 없이, PHP VM 진입 없이.

여러 mount는 등록 순서대로 매칭됩니다. attach 후 핸들러는 **잠기며**, setter는
`HttpServerRuntimeException`을 던집니다.

[`StaticHandler`](/ko/docs/reference/server/static-handler.html) 참고.

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

📋 예정. RFC 6455, HTTP/1.1과 HTTP/2에서의 upgrade.

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 예정. 현재 HTTP/2 요청은 `addHttpHandler`(공통 H1/H2 dispatcher)로 들어옵니다.

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 예정. HTTP/2 위의 unary와 streaming RPC.

### start

```php
public HttpServer::start(): bool
```

서버를 시작하고 `stop()` 또는 치명적 오류까지 호출 스레드를 블로킹합니다.

- `setWorkers(1)` — 호출 스레드에서 event-loop를 돌립니다.
- `setWorkers(N > 1)` — N개의 워커로 `Async\ThreadPool`을 spawn하고 그들의 종료를 `await`합니다.

정상 중단 시 `true`를 반환합니다. 시작 오류(bind 실패, `addHttp3Listener`가 있는데 HTTP/3 빌드가
없음 등) 시 `HttpServerException`(과 상속) 예외를 던집니다.

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. 새 연결 수신을 중단합니다.
2. 활성 요청의 종료를 기다립니다 (`setShutdownTimeout()`까지).
3. 모든 연결을 닫습니다.

성공적 중단 시 `true`를 반환합니다.

> cross-thread `stop()`은 로드맵에 있습니다. 현재는 보통 SIGINT/SIGTERM으로 중단을 시작합니다.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

`__construct`에 전달된 **그** 구성 객체를 반환합니다. 서버 시작 후 구성은 잠겨 있습니다
(`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

HTTP/3에 대한 per-listener observability. 각 `addHttp3Listener()` 항목마다 하나의 레코드를
등록 순서대로 반환합니다. 각 레코드:

| 키 | 값 |
|------|----------|
| `host` | 바인드된 호스트 |
| `port` | UDP 포트 |
| `datagrams_received` | 수신된 datagram 수 |
| `bytes_received` | 수신된 바이트 |
| `datagrams_errored` | 오류 datagram 수 |
| `last_datagram_size` | 마지막 datagram 크기 |
| `last_peer` | 마지막 peer (string) |

확장이 `--enable-http3` **없이** 빌드된 경우 빈 배열을 반환합니다.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

서버 내부 할당자의 스냅샷. RSS 증가의 원인을 특정 서브시스템에 귀속시키는 데 유용합니다.

| 키 | 의미 |
|------|------------|
| `conn_arena_live` | 현재 사용 중인 `http_connection_t` 슬롯 수 (live TCP 연결당 1개) |
| `conn_arena_slots` | 청크 내의 전체 슬롯 수 (live + free, shrink되지 않음) |
| `conn_arena_chunks` | 커밋된 청크 수. 각 청크는 약 768 B 크기의 구조체 `CONN_ARENA_CHUNK_SLOTS`(256)개 |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — 가상 커밋 |
| `body_pool` | 큰 요청 본문(1 MB..128 MB)의 per-size-class LIFO. 각 항목: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | 모든 클래스의 `bytes` 합계 |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 예정.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 예정.

## 예제

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->enablePrecompressed('br', 'gzip')
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['ok' => true, 'path' => $req->getPath()]);
});

$server->start();
```

## 참고

- [`TrueAsync\HttpServerConfig`](/ko/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/ko/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/ko/docs/reference/server/http-response.html)
- [빠른 시작](/ko/docs/server/quickstart.html)
