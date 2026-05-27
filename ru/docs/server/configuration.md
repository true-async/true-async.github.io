---
layout: docs
lang: ru
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /ru/docs/server/configuration.html
page_title: "TrueAsync Server: конфигурация"
description: "HttpServerConfig: listeners, TLS, таймауты, backpressure, лимиты тела, body streaming, JSON-флаги, логирование, HTTP/3."
---

# Конфигурация TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Вся конфигурация сервера задаётся через объект
[`TrueAsync\HttpServerConfig`](/ru/docs/reference/server/http-server-config.html) до вызова
`new HttpServer($config)`. После того как `HttpServer` создан, конфиг **замораживается**:
любые сеттеры на нём будут бросать `HttpServerRuntimeException`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->addListener('0.0.0.0', 8443, tls: true)
    ->addHttp3Listener('0.0.0.0', 8443)
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key')
    ->setWorkers(4)
    ->setKeepAliveTimeout(60)
    ->setMaxBodySize(50 * 1024 * 1024)
    ->setCompressionEnabled(true)
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);

$server = new HttpServer($config);
```

Сеттеры возвращают `static`, поэтому конфиг строится цепочкой.

## Listeners

Сервер может слушать произвольное число TCP/Unix-сокетов и UDP-портов (для HTTP/3) одновременно.

| Метод | Что делает |
|-------|------------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c по preface на plaintext, h2 через ALPN на TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, только HTTP/1.1. Клиент с HTTP/2 preface получит 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, только HTTP/2. Без TLS это h2c с обязательным preface |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 включён автоматически, сертификат сервера используется |
| `addUnixListener($path)` | Unix-сокет, HTTP/1.1 + HTTP/2 (стиль h2c) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC на том же порту
```

Для phased rollout HTTP/3 можно временно выключить анонс `Alt-Svc`:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

Сертификат и ключ общие для всех TLS-listeners (включая HTTP/3). TLS 1.2/1.3, ALPN, слабые шифры
отключены, stateless session tickets, safe renegotiation выключен.

## Workers и bootloader

`setWorkers(1)` (значение по умолчанию) включает single-threaded режим: `start()` крутит event-loop
на вызывающем потоке.

`setWorkers(N > 1)` поднимает встроенный пул из N потоков через `Async\ThreadPool`. Каждый воркер
re-bind'ит те же listeners, ядро (Linux/BSD) распределяет accept через `SO_REUSEPORT`.
Родительский `start()` ждёт завершения всех воркеров.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // выполняется один раз в каждом воркере перед таск-loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Подробности: [Multi-worker](/ru/docs/server/workers.html).

## Таймауты

| Метод | По умолчанию | Что таймаутит |
|-------|--------------|----------------|
| `setReadTimeout($sec)` | — | приём запроса целиком |
| `setWriteTimeout($sec)` | — | отправка ответа |
| `setKeepAliveTimeout($sec)` | — | idle между запросами; `0` отключает keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown: сколько ждать активные запросы |

## Лимиты и backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** — жёсткий предел числа TCP-соединений. `0` снимает ограничение.
- **`setMaxInflightRequests($n)`** — admission control: после этого числа активных обработчиков
  новые запросы получают быстрый отказ. H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM`
  (retry-safe по RFC 7540 §8.1.4). На H2 жёсткий лимит на соединениях не помогает, потому что
  новые streams приезжают по уже принятому соединению. `0` берёт значение `max_connections × 10`.
- **`setMaxBodySize($bytes)`** — максимум на тело запроса. По умолчанию 10 MiB, диапазон 1 KiB..16 GiB.
  H1 отдаёт 413 и закрывает соединение; H2 шлёт `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** — порог CoDel sojourn для accept-side backpressure.
  Когда per-request queue-wait держится выше порога 100 ms подряд, listen-сокет ставится на паузу.
  `0` выключает CoDel. По умолчанию 5 ms; для типичного web 10–20 ms; для медленных handlers
  (БД, IO) 50–100 ms.

### Graceful drain (Step 8)

Управление миграцией нагрузки за L4-балансиром:

| Метод | Дефолт | Назначение |
|-------|--------|------------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | После ±10% jitter лимита соединение получает Connection: close (H1) или GOAWAY (H2). Аналог gRPC `MAX_CONNECTION_AGE`. Production: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close после `Connection: close`/GOAWAY. `0` отключает force-close таймер. |
| `setDrainSpreadMs($ms)` | 5000 | Окно равномерного спреда per-connection drain при CoDel trip / hard-cap (антитhundering herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Минимальный gap между реактивными drain-триггерами. |

## Лимиты HTTP/2 streaming

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB per stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` блокирует обработчик корутины **только** под backpressure: когда
per-stream staging buffer заполнен. По умолчанию 256 KiB (для сравнения: gRPC-Go 64 KiB, Envoy 1 MiB,
Node.js 16 KiB).

## HTTP/3 production knobs

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // per-stream flow control
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // per-source-IP cap, slow-loris защита
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc анонс
```

Connection-level `initial_max_data` выводится как `window × max_concurrent_streams` (паттерн nginx).

## Body streaming

Включает pull-based стрим тела запроса (issue #26): парсеры H1/H2 кладут чанки в очередь, обработчик
читает их через [`HttpRequest::readBody()`](/ru/docs/reference/server/http-request.html#readbody)
без удержания всего тела в RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // обработать чанк (e.g. потоковая запись на диск, парсинг)
    }
    $res->setStatusCode(204);
});
```

Без `setBodyStreamingEnabled(true)` обработчик получает уже полностью прочитанное тело через
`getBody()`; `readBody()` в этом режиме недоступен.

Сравнение для 50 параллельных 20-MiB POST'ов (h2load, WSL2): peak RSS падает 1170 MiB → **197 MiB**
(×6), пропускная способность 36 req/s → **100 req/s** (×2.7), потому что dispatch обработчика больше
не ждёт полного тела.

См. также [Streaming](/ru/docs/server/streaming.html).

## Auto-await body

```php
$config->setAutoAwaitBody(true);   // дефолт: true
```

Когда включено, non-multipart запросы ждут полного тела перед вызовом обработчика
(multipart всегда стрим). Полезно для классической обработки тела целиком.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Эти флаги применяются к [`HttpResponse::json()`](/ru/docs/reference/server/http-response.html#json),
когда вызывающий не передал `$flags` явно. `JSON_THROW_ON_ERROR` молча стрипается:
ошибка кодирования даёт 500 с JSON-телом ошибки, исключение не пробрасывается в обработчик.

## Логирование

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // любой php_stream: файл, php://stderr, php://memory, user wrapper
```

Логгер выключен по умолчанию (`LogSeverity::OFF`). Severity фиксируется на старте, runtime-смены не
поддерживаются (single-threaded lock-free модель).

Уровни (OpenTelemetry SeverityNumber):

| Уровень | Что попадает |
|---------|--------------|
| `OFF` (0) | ничего |
| `DEBUG` (5) | трассировка H3-пакетов и пр. |
| `INFO` (9) | server lifecycle (start/stop), bind retries |
| `WARN` (13) | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` (17) | listener bind failed, hard protocol errors |

`FATAL` намеренно отсутствует: он попадает через `zend_error_noreturn(E_ERROR)`, который уже
прерывает процесс.

## Телеметрия (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Когда включено, входящие `traceparent` / `tracestate` парсятся и приклеиваются к запросу.
В обработчике доступны:

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 lower-hex chars
$req->getSpanId();        // 16 lower-hex chars
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Полный справочник

См. [`TrueAsync\HttpServerConfig`](/ru/docs/reference/server/http-server-config.html): все 60+
методов с детальным описанием и валидными диапазонами значений.
