---
layout: docs
lang: uk
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /uk/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — нативне PHP-розширення, що перетворює PHP на високопродуктивний HTTP/1.1/2/3 сервер. Multi-protocol, TLS 1.2/1.3, стиснення, корутини — усе в одному процесі."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** — нативне PHP-розширення, яке запускає продуктивний HTTP-сервер
**прямо всередині PHP-процесу**. Без окремого daemon, без reverse-proxy, без FastCGI-моста.

З коробки підтримує **HTTP/1.1 і HTTP/2 на одному TCP-порту**. Вибір протоколу відбувається
через ALPN-negotiation (для TLS) або HTTP Upgrade. HTTP/3 працює на тому самому UDP-порту
(QUIC) і анонсується клієнтам через заголовок `Alt-Svc`.

WebSocket, SSE і gRPC уже спроєктовані під ту саму модель одного listener'а з детектом
протоколу, але поки ще в роботі (див. [Можливості](#можливості)).

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

## Навіщо

**Мета сервера — розкрити потенціал конкурентних застосунків на PHP.**

TrueAsync дав мові справжні корутини, неблокуючий I/O і пули з'єднань. Щоб цей потенціал
реалізувався під production-навантаженням, потрібен сервер, який від початку спроєктований
під цю модель: довгоживучий процес з event-loop'ом, де кожен запит отримує власну корутину,
а планувальник перемикається між ними на кожному I/O-очікуванні.

TrueAsync Server і є такий сервер. Жодного прошарку між корутинами і мережею: listener,
парсер протоколу, диспетчер запитів і обробник живуть в одному процесі і в одному
event-loop'і. З'єднання з БД переуживаються через `Async\Pool`, opcache гарячий між запитами,
cold-start платиться один раз — на `start()`.

## Можливості

| Статус | Можливість | Деталі |
|--------|-----------|--------|
| ✅ | **HTTP/1.1** | Повна відповідність RFC 9112, keep-alive, pipelining (через [llhttp](https://github.com/nodejs/llhttp), той самий парсер, що в Node.js) |
| ✅ | **HTTP/2** | Мультиплексування, server push (libnghttp2 ≥ 1.57, floor для CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | UDP-транспорт на libngtcp2 + libnghttp3, OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, ALPN negotiation, слабкі шифри вимкнено |
| ✅ | **Стиснення** | gzip (zlib-ng / zlib), Brotli, zstd: на відповідь і декодинг вхідних тіл у всіх протоколах |
| ✅ | **Multipart / file uploads** | Streaming zero-copy парсер |
| ✅ | **Backpressure** | CoDel (RFC 8289), адаптивна пауза accept під навантаженням |
| ✅ | **Streaming request body** | Опціонально через [`HttpRequest::readBody()`](/uk/docs/reference/server/http-request.html); uploads без утримання тіла в RAM |
| ✅ | **sendFile** | Ефективна віддача файлів з диска прямо з обробника |
| ✅ | **Built-in worker pool** | `setWorkers(N)`: N потоків через `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Per-request scope** | Кожен обробник у власному scope; `Async\request_context()` дає спільний контекст по всьому дереву корутин запиту |
| ✅ | **Native coroutines** | Глибока інтеграція з TrueAsync: будь-який блокуючий I/O в обробнику паркує корутину, а не потік |
| ✅ | **Zero-copy** | Мінімум алокацій на гарячому шляху |
| 📋 | **WebSocket** | RFC 6455, Upgrade з HTTP/1.1 і HTTP/2 |
| 📋 | **SSE** | Server-Sent Events |
| 📋 | **gRPC** | поверх HTTP/2, unary і streaming |

## Архітектура: single-threaded event loop

Та сама модель, що в [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) і Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**Один потік володіє і з'єднанням, і запитом від accept до send.**
Немає передачі між accept-thread і worker-thread, немає блокувань, немає перемикань контексту між ними.
Один event-loop приймає з'єднання, читає байти з сокета, парсить HTTP, диспетчеризує запит в
обробник і пише відповідь, не залишаючи потік.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

Неблокуючий I/O робить **libuv-реактор** (через TrueAsync). Коли корутині треба зачекати
файл, БД або наступний WebSocket-кадр, вона передає управління event-loop, який одразу
підхоплює наступну готову подію. Потік ніколи не простоює в `read()`/`recv()`.

Для масштабування за ядрами піднімається **multi-worker** через
[`setWorkers(N)`](/uk/docs/reference/server/http-server-config.html#setworkers):
вбудований `Async\ThreadPool` піднімає N OS-потоків, кожен з власним незалежним event-loop,
а `SO_REUSEPORT` (Linux/BSD) дає ядру розподіляти вхідні з'єднання між ними.
Жодного shared state, жодних глобальних блокувань.

## Звідки почати

- [Швидкий старт](/uk/docs/server/quickstart.html): встановлення і мінімальний приклад за 5 хвилин
- [Конфігурація](/uk/docs/server/configuration.html): listeners, workers, TLS, таймаути, body streaming, bootloader
- [Стиснення](/uk/docs/server/compression.html): gzip / brotli / zstd, переговори, BREACH
- [Статичні файли і sendFile](/uk/docs/server/static-files.html): `StaticHandler`, precompressed sidecars, Range
- [Стрімінг](/uk/docs/server/streaming.html): стрім тіла запиту і стрім відповіді
- [Multi-worker](/uk/docs/server/workers.html): `setWorkers(N)`, bootloader, per-request scope
- [Приклади](/uk/docs/server/examples.html): JSON-API, статика, fan-out, multipart upload
- [Архітектура](/uk/architecture/server.html): внутрішня будова

### Довідник API

- [`TrueAsync\HttpServer`](/uk/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/uk/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/uk/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/uk/docs/reference/server/http-response.html)
- [`TrueAsync\StaticHandler`](/uk/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/uk/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/uk/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/uk/docs/reference/server/log-severity.html)
- [Винятки](/uk/docs/reference/server/exceptions.html)

## Альтернативи

[FrankenPHP](/uk/docs/frankenphp.html) — окремий вбудований сервер на Caddy/Go, в якому PHP
виступає воркером. Зручний, коли потрібні фічі Caddy (автоматичний Let's Encrypt, конфіг через
Caddyfile) або інтеграція в наявну Caddy-інфраструктуру. TrueAsync Server — нативна альтернатива
без Go-runtime: сервер живе прямо в процесі PHP.
