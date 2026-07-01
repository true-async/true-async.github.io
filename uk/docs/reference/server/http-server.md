---
layout: docs
lang: uk
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /uk/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — головний клас вбудованого HTTP-сервера. Реєстрація обробників, старт/стоп, телеметрія, runtime stats."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Головний клас вбудованого сервера. Отримує конфіг через конструктор, приймає обробники
протоколів, запускається через `start()` і блокує потік до `stop()`.

```php
namespace TrueAsync;

final class HttpServer
{
    public function __construct(HttpServerConfig $config);

    public function addHttpHandler(callable $handler): static;
    public function addStaticHandler(StaticHandler $handler): static;
    public function addWebSocketHandler(callable $handler): static;
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

## Методи

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Створює сервер із заданим конфігом. **Конфіг заморожується** на цьому виклику — наступні сетери
кидають `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Реєструє обробник HTTP/1.1 і HTTP/2 запитів. Сигнатура:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Кожен запит виконується у **власній корутині** в [per-request scope](/uk/docs/server/workers.html#per-request-scope).
Обробник повертає `void`; відповідь надсилається через `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Реєструє static-mount (issue #13). Запити під `$handler->getUrlPrefix()` обслуговуються
**повністю в C** — без спавна корутини, без заходу в PHP VM.

Множинні mount'и матчаться в порядку реєстрації. Після attach handler **блокується** —
будь-які сетери на ньому кидають `HttpServerRuntimeException`.

Див. [`StaticHandler`](/uk/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

Реєструє обробник full-duplex WebSocket-з'єднань (RFC 6455). Upgrade приймається з HTTP/1.1 і з
HTTP/2 (RFC 8441 Extended CONNECT), плюс `wss://` через TLS і permessage-deflate (RFC 7692). Кожне
з'єднання обслуговується власною корутиною.

Підтримуються дві сигнатури; сервер сам визначає кількість параметрів через Reflection під час
реєстрації:

```php
function (WebSocket $ws): void
function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade): void
```

Двопараметрична форма (тільки `$ws`) приймає upgrade з налаштуваннями за замовчуванням.
Трипараметрична форма дає доступ до `WebSocketUpgrade`: subprotocol negotiation і можливість
відхилити upgrade до відправки `101`.

Див. [керівництво по WebSocket](/uk/docs/server/websocket.html) і
[довідник класів `WebSocket`](/uk/docs/reference/server/websocket.html).

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Заплановано. Зараз HTTP/2 запити потрапляють у `addHttpHandler` (спільний H1/H2 диспетчер).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Заплановано. Поверх HTTP/2, unary і streaming RPC.

### start

```php
public HttpServer::start(): bool
```

Запускає сервер і блокує потік, що викликає, до `stop()` або фатальної помилки.

- При `setWorkers(1)` — крутить event-loop на потоці, що викликає.
- При `setWorkers(N > 1)` — спавнить `Async\ThreadPool` з N воркерів і `await`ить їх завершення.

Повертає `true` при штатній зупинці. Кидає `HttpServerException` (і нащадків) при помилках
запуску (bind failed, відсутня потрібна збірка для HTTP/3 за наявності `addHttp3Listener` тощо).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. Припиняє приймання нових з'єднань.
2. Чекає завершення активних запитів (до `setShutdownTimeout()`).
3. Закриває всі з'єднання.

Повертає `true` при успішній зупинці.

> Cross-thread `stop()` — у roadmap. Зараз зупинку найчастіше ініціюють через SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Повертає **той самий** об'єкт конфігу, що був переданий у `__construct`. Після старту сервера
конфіг заблоковано (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Per-listener observability для HTTP/3. Один запис на кожен `addHttp3Listener()` у порядку
реєстрації. Кожен запис містить:

| Ключ | Значення |
|------|----------|
| `host` | прив'язаний host |
| `port` | UDP-порт |
| `datagrams_received` | лічильник прийнятих датаграм |
| `bytes_received` | прийнято байтів |
| `datagrams_errored` | датаграм з помилкою |
| `last_datagram_size` | розмір останньої датаграми |
| `last_peer` | останній peer (string) |

Повертає порожній масив, коли розширення зібрано **без** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot внутрішніх алокаторів сервера. Допомагає атрибутувати зростання RSS на конкретні
підсистеми.

| Ключ | Що означає |
|------|------------|
| `conn_arena_live` | `http_connection_t` слотів зараз у роботі (один на live TCP-connection) |
| `conn_arena_slots` | всього слотів у чанках (live + free, не shrink'ається) |
| `conn_arena_chunks` | скільки чанків закомічено; кожен — `CONN_ARENA_CHUNK_SLOTS` (256) структур по ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — віртуальний commitment |
| `body_pool` | per-size-class LIFO великих request-bodies (1 MB..128 MB). Кожен запис: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | сума `bytes` по всіх класах |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Заплановано.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Заплановано.

## Приклад

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

## Див. також

- [`TrueAsync\HttpServerConfig`](/uk/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/uk/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/uk/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/uk/docs/reference/server/websocket.html)
- [Quickstart](/uk/docs/server/quickstart.html)
