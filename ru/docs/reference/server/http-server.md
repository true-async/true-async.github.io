---
layout: docs
lang: ru
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /ru/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — главный класс встроенного HTTP-сервера. Регистрация обработчиков, старт/стоп, телеметрия, runtime stats."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Главный класс встроенного сервера. Получает конфиг через конструктор, принимает обработчики
протоколов, запускается через `start()` и блокирует поток до `stop()`.

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

## Методы

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Создаёт сервер с заданным конфигом. **Конфиг замораживается** на этом вызове — последующие сеттеры
бросают `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Регистрирует обработчик HTTP/1.1 и HTTP/2 запросов. Сигнатура:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Каждый запрос выполняется в **собственной корутине** в [per-request scope](/ru/docs/server/workers.html#per-request-scope).
Обработчик возвращает `void`; ответ отправляется через `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Регистрирует static-mount (issue #13). Запросы под `$handler->getUrlPrefix()` обслуживаются
**полностью в C** — без спавна корутины, без захода в PHP VM.

Множественные mount'ы матчатся в порядке регистрации. После attach handler **блокируется** —
любые сеттеры на нём бросают `HttpServerRuntimeException`.

См. [`StaticHandler`](/ru/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

📋 Запланировано. RFC 6455, upgrade с HTTP/1.1 и HTTP/2.

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Запланировано. Сейчас HTTP/2 запросы попадают в `addHttpHandler` (общий H1/H2 диспетчер).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Запланировано. Поверх HTTP/2, unary и streaming RPC.

### start

```php
public HttpServer::start(): bool
```

Запускает сервер и блокирует вызывающий поток до `stop()` или фатальной ошибки.

- При `setWorkers(1)` — крутит event-loop на вызывающем потоке.
- При `setWorkers(N > 1)` — спавнит `Async\ThreadPool` из N воркеров и `await`ит их завершение.

Возвращает `true` при штатной остановке. Бросает `HttpServerException` (и наследников) при ошибках
запуска (bind failed, отсутствует требуемая сборка для HTTP/3 при наличии `addHttp3Listener` и т.п.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. Прекращает приём новых соединений.
2. Ждёт завершения активных запросов (до `setShutdownTimeout()`).
3. Закрывает все соединения.

Возвращает `true` при успешной остановке.

> Cross-thread `stop()` — в roadmap. Сейчас остановку чаще всего инициируют через SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Возвращает **тот же** объект конфига, что был передан в `__construct`. После старта сервера
конфиг заблокирован (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Per-listener observability для HTTP/3. Одна запись на каждый `addHttp3Listener()` в порядке
регистрации. Каждая запись содержит:

| Ключ | Значение |
|------|----------|
| `host` | привязанный host |
| `port` | UDP-порт |
| `datagrams_received` | счётчик пришедших датаграмм |
| `bytes_received` | байтов принято |
| `datagrams_errored` | датаграмм с ошибкой |
| `last_datagram_size` | размер последней датаграммы |
| `last_peer` | последний peer (string) |

Возвращает пустой массив, когда расширение собрано **без** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot внутренних аллокаторов сервера. Помогает атрибутировать рост RSS на конкретные
подсистемы.

| Ключ | Что значит |
|------|------------|
| `conn_arena_live` | `http_connection_t` слотов сейчас в работе (один на live TCP-connection) |
| `conn_arena_slots` | всего слотов в чанках (live + free, не shrink'ается) |
| `conn_arena_chunks` | сколько чанков закоммичено; каждый — `CONN_ARENA_CHUNK_SLOTS` (256) структур по ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — виртуальная commitment |
| `body_pool` | per-size-class LIFO крупных request-bodies (1 MB..128 MB). Каждая запись: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | сумма `bytes` по всем классам |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Запланировано.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Запланировано.

## Пример

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

## См. также

- [`TrueAsync\HttpServerConfig`](/ru/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/ru/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/ru/docs/reference/server/http-response.html)
- [Quickstart](/ru/docs/server/quickstart.html)
