---
layout: docs
lang: uk
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /uk/docs/server/configuration.html
page_title: "TrueAsync Server: конфігурація"
description: "HttpServerConfig: listeners, TLS, таймаути, backpressure, ліміти тіла, body streaming, JSON-прапорці, логування, HTTP/3."
---

# Конфігурація TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Уся конфігурація сервера задається через об'єкт
[`TrueAsync\HttpServerConfig`](/uk/docs/reference/server/http-server-config.html) до виклику
`new HttpServer($config)`. Після того, як `HttpServer` створено, конфіг **заморожується**:
будь-які сетери на ньому кидатимуть `HttpServerRuntimeException`.

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

Сетери повертають `static`, тому конфіг будується ланцюжком.

## Listeners

Сервер може слухати довільну кількість TCP/Unix-сокетів і UDP-портів (для HTTP/3) одночасно.

| Метод | Що робить |
|-------|-----------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c за preface на plaintext, h2 через ALPN на TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, лише HTTP/1.1. Клієнт з HTTP/2 preface отримає 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, лише HTTP/2. Без TLS це h2c з обов'язковим preface |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 увімкнено автоматично, використовується сертифікат сервера |
| `addUnixListener($path)` | Unix-сокет, HTTP/1.1 + HTTP/2 (стиль h2c) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC на тому самому порту
```

Для phased rollout HTTP/3 можна тимчасово вимкнути анонс `Alt-Svc`:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

Сертифікат і ключ спільні для всіх TLS-listeners (включно з HTTP/3). TLS 1.2/1.3, ALPN, слабкі шифри
вимкнено, stateless session tickets, safe renegotiation вимкнено.

## Workers і bootloader

`setWorkers(1)` (значення за замовчуванням) вмикає single-threaded режим: `start()` крутить event-loop
на потоці, що викликає.

`setWorkers(N > 1)` піднімає вбудований пул з N потоків через `Async\ThreadPool`. Кожен воркер
re-bind'ить ті самі listeners, ядро (Linux/BSD) розподіляє accept через `SO_REUSEPORT`.
Батьківський `start()` чекає завершення всіх воркерів.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // виконується один раз у кожному воркері перед таск-loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Подробиці: [Multi-worker](/uk/docs/server/workers.html).

## Таймаути

| Метод | За замовчуванням | Що таймаутить |
|-------|------------------|---------------|
| `setReadTimeout($sec)` | — | приймання запиту цілком |
| `setWriteTimeout($sec)` | — | надсилання відповіді |
| `setKeepAliveTimeout($sec)` | — | idle між запитами; `0` вимикає keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown: скільки чекати активні запити |

## Ліміти і backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** — жорстка межа кількості TCP-з'єднань. `0` знімає обмеження.
- **`setMaxInflightRequests($n)`** — admission control: після цього числа активних обробників
  нові запити отримують швидку відмову. H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM`
  (retry-safe за RFC 7540 §8.1.4). На H2 жорстка межа на з'єднаннях не допомагає, бо
  нові streams приїздять по вже прийнятому з'єднанню. `0` бере значення `max_connections × 10`.
- **`setMaxBodySize($bytes)`** — максимум на тіло запиту. За замовчуванням 10 MiB, діапазон 1 KiB..16 GiB.
  H1 віддає 413 і закриває з'єднання; H2 шле `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** — поріг CoDel sojourn для accept-side backpressure.
  Коли per-request queue-wait тримається вище порогу 100 ms поспіль, listen-сокет ставиться на паузу.
  `0` вимикає CoDel. За замовчуванням 5 ms; для типового web 10–20 ms; для повільних обробників
  (БД, IO) 50–100 ms.

### Graceful drain (Step 8)

Керування міграцією навантаження за L4-балансувальником:

| Метод | Дефолт | Призначення |
|-------|--------|-------------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | Після ±10% jitter ліміту з'єднання отримує Connection: close (H1) або GOAWAY (H2). Аналог gRPC `MAX_CONNECTION_AGE`. Production: 600_000 (10 хв). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close після `Connection: close`/GOAWAY. `0` вимикає force-close таймер. |
| `setDrainSpreadMs($ms)` | 5000 | Вікно рівномірного спреду per-connection drain при CoDel trip / hard-cap (анти-thundering-herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Мінімальний gap між реактивними drain-тригерами. |

## Ліміти HTTP/2 streaming

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB per stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` блокує корутину обробника **лише** під backpressure: коли
per-stream staging buffer заповнений. За замовчуванням 256 KiB (для порівняння: gRPC-Go 64 KiB,
Envoy 1 MiB, Node.js 16 KiB).

## HTTP/3 production knobs

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // per-stream flow control
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // per-source-IP cap, slow-loris захист
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc анонс
```

Connection-level `initial_max_data` виводиться як `window × max_concurrent_streams` (патерн nginx).

## WebSocket

```php
$config
    ->setWsMaxMessageSize(1024 * 1024)   // 1 MiB, 128 .. 256 MiB
    ->setWsMaxFrameSize(1024 * 1024)     // 1 MiB, той самий діапазон
    ->setWsPingIntervalMs(30_000)        // keepalive PING на простої
    ->setWsPongTimeoutMs(60_000)         // дедлайн на відповідний PONG
    ->setWsPermessageDeflate(false);     // RFC 7692, вимкнено за замовчуванням
```

- **`setWsMaxMessageSize($bytes)`** — максимум на пересібране повідомлення. Перевищення дає
  `1009 Message Too Big` і розрив з'єднання (RFC 6455 §7.4.1).
- **`setWsMaxFrameSize($bytes)`** — максимум на один фрейм. Захищає від fragment-flood, коли клієнт
  шле мільйони крихітних фрагментів.
- **`setWsPingIntervalMs($ms)`** — як часто сервер сам шле PING на з'єднаннях, що простоюють.
  `0` вимикає автоматичний ping.
- **`setWsPongTimeoutMs($ms)`** — скільки чекати PONG після PING, перш ніж вважати з'єднання
  мертвим і закрити його кодом `1001 GoingAway`. `0` вимикає таймаут.
- **`setWsPermessageDeflate($bool)`** — RFC 7692, стиснення на рівні повідомлень. Вимкнено за
  замовчуванням: це свідомий opt-in, бо стиснення коштує CPU і розширює поверхню атак
  decompression-bomb. Узгоджується лише коли клієнт сам пропонує це розширення; потребує збірки
  з zlib.

Подробиці про API з'єднання дивіться в [керівництві по WebSocket](/uk/docs/server/websocket.html) і
[довіднику](/uk/docs/reference/server/websocket.html).

## Body streaming

Вмикає pull-based стрім тіла запиту (issue #26): парсери H1/H2 кладуть чанки в чергу, обробник
читає їх через [`HttpRequest::readBody()`](/uk/docs/reference/server/http-request.html#readbody)
без утримання всього тіла в RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // обробити чанк (наприклад, потоковий запис на диск, парсинг)
    }
    $res->setStatusCode(204);
});
```

Без `setBodyStreamingEnabled(true)` обробник отримує вже повністю прочитане тіло через
`getBody()`; `readBody()` у цьому режимі недоступний.

Порівняння для 50 паралельних 20-MiB POST'ів (h2load, WSL2): peak RSS падає 1170 MiB → **197 MiB**
(×6), пропускна спроможність 36 req/s → **100 req/s** (×2.7), бо dispatch обробника більше
не чекає повного тіла.

Див. також [Стрімінг](/uk/docs/server/streaming.html).

## Auto-await body

```php
$config->setAutoAwaitBody(true);   // дефолт: true
```

Коли увімкнено, non-multipart запити чекають повного тіла перед викликом обробника
(multipart завжди стрім). Корисно для класичної обробки тіла цілком.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Ці прапорці застосовуються до [`HttpResponse::json()`](/uk/docs/reference/server/http-response.html#json),
коли той, хто викликає, не передав `$flags` явно. `JSON_THROW_ON_ERROR` мовчки стрипається:
помилка кодування дає 500 з JSON-тілом помилки, виняток не пробрасується в обробник.

## Логування

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // будь-який php_stream: файл, php://stderr, php://memory, user wrapper
```

Логер вимкнено за замовчуванням (`LogSeverity::OFF`). Severity фіксується на старті, runtime-зміни
не підтримуються (single-threaded lock-free модель).

Рівні (OpenTelemetry SeverityNumber):

| Рівень | Що потрапляє |
|--------|--------------|
| `OFF` (0) | нічого |
| `DEBUG` (5) | трасування H3-пакетів і т. п. |
| `INFO` (9) | server lifecycle (start/stop), bind retries |
| `WARN` (13) | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` (17) | listener bind failed, hard protocol errors |

`FATAL` навмисно відсутній: він потрапляє через `zend_error_noreturn(E_ERROR)`, який і так
перериває процес.

## Телеметрія (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Коли увімкнено, вхідні `traceparent` / `tracestate` парсяться і прикріплюються до запиту.
В обробнику доступні:

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 lower-hex chars
$req->getSpanId();        // 16 lower-hex chars
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Повний довідник

Див. [`TrueAsync\HttpServerConfig`](/uk/docs/reference/server/http-server-config.html): усі 60+
методів з детальним описом і валідними діапазонами значень.
