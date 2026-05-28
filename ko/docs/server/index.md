---
layout: docs
lang: ko
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /ko/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — PHP를 고성능 HTTP/1.1/2/3 서버로 변환하는 네이티브 PHP 확장. Multi-protocol, TLS 1.2/1.3, 압축, 코루틴 — 모든 것이 단일 프로세스 안에서."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** 는 고성능 HTTP 서버를 **PHP 프로세스 내부에서 직접** 실행하는 네이티브
PHP 확장입니다. 별도의 daemon, reverse-proxy, FastCGI 브리지가 필요하지 않습니다.

기본적으로 **HTTP/1.1과 HTTP/2를 동일한 TCP 포트에서** 지원합니다. 프로토콜 선택은
ALPN negotiation(TLS의 경우) 또는 HTTP Upgrade를 통해 이루어집니다. HTTP/3는 동일한 UDP
포트(QUIC)에서 동작하며 `Alt-Svc` 헤더로 클라이언트에 광고됩니다.

WebSocket, SSE, gRPC는 동일한 단일 listener + 프로토콜 감지 모델로 설계되어 있지만 아직
작업 중입니다([Roadmap](#기능) 참고).

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

## 왜 필요한가

**서버의 목표는 PHP 동시성 애플리케이션의 잠재력을 끌어내는 것입니다.**

TrueAsync는 PHP에 진정한 코루틴, 논블로킹 I/O, 커넥션 풀을 제공했습니다. 이 잠재력이
프로덕션 트래픽에서 실현되려면 이 모델에 맞춰 처음부터 설계된 서버가 필요합니다: event-loop를
가진 장기 실행 프로세스에서 모든 요청이 자체 코루틴을 받고, 스케줄러가 I/O 대기마다 그들
사이를 전환합니다.

TrueAsync Server가 바로 그러한 서버입니다. 코루틴과 네트워크 사이에 어떤 중간 계층도 없습니다:
listener, 프로토콜 파서, 요청 디스패처, 핸들러가 모두 하나의 프로세스, 하나의 event-loop
안에서 동작합니다. DB 연결은 `Async\Pool`을 통해 재사용되고, opcache는 요청 간에 따뜻하게
유지되며, cold-start 비용은 `start()` 시 한 번만 지불됩니다.

## 기능

| 상태 | 기능 | 상세 |
|--------|-------------|--------|
| ✅ | **HTTP/1.1** | RFC 9112 완전 준수, keep-alive, pipelining ([llhttp](https://github.com/nodejs/llhttp) 사용, Node.js와 동일한 파서) |
| ✅ | **HTTP/2** | 멀티플렉싱, server push (libnghttp2 ≥ 1.57, CVE-2023-44487 대응 최소 버전) |
| ✅ | **HTTP/3 / QUIC** | libngtcp2 + libnghttp3 기반 UDP 전송, OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, ALPN negotiation, 약한 cipher 비활성화 |
| ✅ | **압축** | gzip (zlib-ng / zlib), Brotli, zstd: 모든 프로토콜에서 응답 압축 및 요청 본문 해제 |
| ✅ | **Multipart / 파일 업로드** | Streaming zero-copy 파서 |
| ✅ | **Backpressure** | CoDel (RFC 8289), 부하 상황에서 적응형 accept 일시 정지 |
| ✅ | **요청 본문 스트리밍** | [`HttpRequest::readBody()`](/ko/docs/reference/server/http-request.html)로 선택 가능; 본문을 RAM에 유지하지 않는 업로드 |
| ✅ | **sendFile** | 핸들러에서 디스크의 파일을 효율적으로 직접 전송 |
| ✅ | **내장 worker pool** | `setWorkers(N)`: `Async\ThreadPool` + `SO_REUSEPORT`를 통한 N개 스레드 |
| ✅ | **요청별 scope** | 모든 핸들러가 자체 scope에서 동작; `Async\request_context()`로 요청의 코루틴 트리 전체에 공유 컨텍스트 제공 |
| ✅ | **네이티브 코루틴** | TrueAsync와 깊게 통합: 핸들러 내부의 모든 블로킹 I/O가 스레드가 아닌 코루틴을 일시 중단 |
| ✅ | **Zero-copy** | hot path에서 최소한의 할당 |
| 📋 | **WebSocket** | RFC 6455, HTTP/1.1 및 HTTP/2에서의 Upgrade |
| 📋 | **SSE** | Server-Sent Events |
| 📋 | **gRPC** | HTTP/2 위에서 unary 및 streaming |

## 아키텍처: single-threaded event loop

[NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org), Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs)와
동일한 모델입니다.

**하나의 스레드가 accept부터 send까지 연결과 요청을 모두 소유합니다.**
accept-thread와 worker-thread 사이 전달이 없고, 락이 없으며, 둘 사이의 컨텍스트 스위칭도
없습니다. 하나의 event-loop가 연결을 수락하고, 소켓에서 바이트를 읽고, HTTP를 파싱하고,
요청을 핸들러에 디스패치하고, 응답을 작성합니다 — 모두 스레드를 떠나지 않고.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

논블로킹 I/O는 (TrueAsync를 통한) **libuv 리액터**가 담당합니다. 코루틴이 파일, DB 또는
다음 WebSocket 프레임을 기다려야 할 때, 제어를 event-loop에 넘기고 event-loop는 즉시 다음에
준비된 이벤트를 픽업합니다. 스레드가 `read()`/`recv()`에서 대기 상태로 머무는 일은 없습니다.

코어를 활용한 수평 확장은
[`setWorkers(N)`](/ko/docs/reference/server/http-server-config.html#setworkers)을 통한
**multi-worker**로 가능합니다: 내장 `Async\ThreadPool`이 N개의 OS 스레드를 띄우고, 각각
독립적인 event-loop를 가지며, `SO_REUSEPORT`(Linux/BSD)가 커널 수준에서 들어오는 연결을
분산합니다. 공유 상태도, 글로벌 락도 없습니다.

## 어디서 시작할까

- [빠른 시작](/ko/docs/server/quickstart.html): 5분 만에 설치와 최소 예제
- [설정](/ko/docs/server/configuration.html): listener, worker, TLS, 타임아웃, 본문 스트리밍, bootloader
- [압축](/ko/docs/server/compression.html): gzip / brotli / zstd, negotiation, BREACH
- [정적 파일과 sendFile](/ko/docs/server/static-files.html): `StaticHandler`, precompressed sidecar, Range
- [스트리밍](/ko/docs/server/streaming.html): 요청 본문 스트림과 응답 스트림
- [멀티 워커](/ko/docs/server/workers.html): `setWorkers(N)`, bootloader, 요청별 scope
- [예제](/ko/docs/server/examples.html): JSON-API, 정적 파일, fan-out, multipart 업로드
- [아키텍처](/ko/architecture/server.html): 내부 구조

### API 레퍼런스

- [`TrueAsync\HttpServer`](/ko/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/ko/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/ko/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/ko/docs/reference/server/http-response.html)
- [`TrueAsync\StaticHandler`](/ko/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/ko/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/ko/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/ko/docs/reference/server/log-severity.html)
- [예외](/ko/docs/reference/server/exceptions.html)

## 대안

[FrankenPHP](/ko/docs/frankenphp.html) — Caddy/Go 기반의 내장형 서버로, PHP가 워커 역할을
합니다. Caddy의 기능(자동 Let's Encrypt, Caddyfile 라우팅)이 필요하거나 기존 Caddy
인프라와 통합해야 할 때 편리합니다. TrueAsync Server는 Go 런타임이 없는 네이티브 대안입니다:
서버가 PHP 프로세스 내부에 그대로 살아 있습니다.
