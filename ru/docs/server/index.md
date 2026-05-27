---
layout: docs
lang: ru
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /ru/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — нативное PHP-расширение, превращающее PHP в высокопроизводительный HTTP/1.1/2/3 сервер. Multi-protocol, TLS 1.2/1.3, компрессия, корутины — всё в одном процессе."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** — нативное PHP-расширение, которое запускает производительный HTTP-сервер
**прямо внутри PHP-процесса**. Без отдельного daemon, без reverse-proxy, без FastCGI-моста.

Из коробки поддерживает **HTTP/1.1 и HTTP/2 на одном TCP-порту**. Выбор протокола
происходит через ALPN-negotiation (для TLS) или HTTP Upgrade. HTTP/3 работает на том же
UDP-порту (QUIC) и анонсируется клиентам через заголовок `Alt-Svc`.

WebSocket, SSE и gRPC уже спроектированы под ту же модель одного listener'а с детектом
протокола, но пока ещё в работе (см. [Roadmap](#возможности)).

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

## Зачем

**Цель сервера — раскрыть потенциал конкурентных приложений на PHP.**

TrueAsync дал языку настоящие корутины, неблокирующий I/O и пулы соединений. Чтобы этот
потенциал реализовался в production-нагрузке, нужен сервер, который изначально спроектирован
под эту модель: долгоживущий процесс с event-loop'ом, где каждый запрос получает свою корутину,
а планировщик переключается между ними на каждом I/O-ожидании.

TrueAsync Server и есть такой сервер. Никакой прослойки между корутинами и сетью:
listener, парсер протокола, диспетчер запросов и обработчик живут в одном процессе и в одном
event-loop'е. Соединения с БД переиспользуются через `Async\Pool`, opcache горячий между
запросами, cold-start платится один раз, при `start()`.

## Возможности

| Статус | Возможность | Детали |
|--------|-------------|--------|
| ✅ | **HTTP/1.1** | Полное соответствие RFC 9112, keep-alive, pipelining (через [llhttp](https://github.com/nodejs/llhttp), тот же парсер, что у Node.js) |
| ✅ | **HTTP/2** | Мультиплексирование, server push (libnghttp2 ≥ 1.57, floor для CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | UDP-транспорт на libngtcp2 + libnghttp3, OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, ALPN negotiation, отключены слабые шифры |
| ✅ | **Компрессия** | gzip (zlib-ng / zlib), Brotli, zstd: на ответ и декодинг входящих тел во всех протоколах |
| ✅ | **Multipart / file uploads** | Streaming zero-copy парсер |
| ✅ | **Backpressure** | CoDel (RFC 8289), адаптивная приостановка accept под нагрузкой |
| ✅ | **Streaming request body** | Опционально через [`HttpRequest::readBody()`](/ru/docs/reference/server/http-request.html); uploads без удержания тела в RAM |
| ✅ | **sendFile** | Эффективная отдача файлов с диска прямо из обработчика |
| ✅ | **Built-in worker pool** | `setWorkers(N)`: N потоков через `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Per-request scope** | Каждый обработчик в своём scope; `Async\request_context()` даёт общий контекст по всему дереву корутин запроса |
| ✅ | **Native coroutines** | Глубокая интеграция с TrueAsync: любой блокирующий I/O в обработчике приостанавливает корутину, а не поток |
| ✅ | **Zero-copy** | Минимум аллокаций на горячем пути |
| 📋 | **WebSocket** | RFC 6455, Upgrade с HTTP/1.1 и HTTP/2 |
| 📋 | **SSE** | Server-Sent Events |
| 📋 | **gRPC** | поверх HTTP/2, unary и streaming |

## Архитектура: single-threaded event loop

Та же модель, что у [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) и Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**Один поток владеет и соединением, и запросом от accept до send.**
Нет передачи между accept-thread и worker-thread, нет блокировок, нет переключений контекста между ними.
Один event-loop принимает соединение, читает байты из сокета, парсит HTTP, диспетчеризует запрос в
обработчик и пишет ответ, не покидая поток.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

Неблокирующий I/O делает **libuv-реактор** (через TrueAsync). Когда корутине нужно подождать
файл, БД или следующий WebSocket-кадр, она передаёт управление event-loop, который сразу
подбирает следующее готовое событие. Поток никогда не простаивает в `read()`/`recv()`.

Для масштабирования по ядрам поднимается **multi-worker** через
[`setWorkers(N)`](/ru/docs/reference/server/http-server-config.html#setworkers):
встроенный `Async\ThreadPool` поднимает N OS-потоков, каждый с собственным независимым event-loop,
и `SO_REUSEPORT` (Linux/BSD) даёт ядру распределять входящие соединения по ним.
Никакого shared state, никаких глобальных блокировок.

## Где начинать

- [Быстрый старт](/ru/docs/server/quickstart.html): установка и минимальный пример за 5 минут
- [Конфигурация](/ru/docs/server/configuration.html): listeners, workers, TLS, таймауты, body streaming, bootloader
- [Компрессия](/ru/docs/server/compression.html): gzip / brotli / zstd, переговоры, BREACH
- [Статика и sendFile](/ru/docs/server/static-files.html): `StaticHandler`, precompressed sidecars, Range
- [Streaming](/ru/docs/server/streaming.html): стрим тела запроса и стрим ответа
- [Multi-worker](/ru/docs/server/workers.html): `setWorkers(N)`, bootloader, per-request scope
- [Примеры](/ru/docs/server/examples.html): JSON-API, статика, fan-out, multipart upload
- [Архитектура](/ru/architecture/server.html): внутренности

### Справочник API

- [`TrueAsync\HttpServer`](/ru/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/ru/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/ru/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/ru/docs/reference/server/http-response.html)
- [`TrueAsync\StaticHandler`](/ru/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/ru/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/ru/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/ru/docs/reference/server/log-severity.html)
- [Исключения](/ru/docs/reference/server/exceptions.html)

## Альтернативы

[FrankenPHP](/ru/docs/frankenphp.html) — отдельный встраиваемый сервер на Caddy/Go, в котором PHP
выступает воркером. Удобен, когда нужны Caddy-фичи (автоматический Let's Encrypt, конфиг через
Caddyfile) или интеграция в существующую Caddy-инфраструктуру. TrueAsync Server — нативная альтернатива
без Go-runtime: сервер живёт прямо в процессе PHP.
