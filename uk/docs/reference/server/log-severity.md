---
layout: docs
lang: uk
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /uk/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — enum рівнів логування сервера. Backed by OpenTelemetry SeverityNumber."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum рівнів логування сервера. Backing-значення відповідають
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); експортується стабільне підмножина.

```php
namespace TrueAsync;

enum LogSeverity: int
{
    case OFF   = 0;
    case DEBUG = 5;
    case INFO  = 9;
    case WARN  = 13;
    case ERROR = 17;
}
```

| Case | OTel value | Що потрапляє |
|------|-----------:|--------------|
| `OFF` | 0 | нічого |
| `DEBUG` | 5 | трасування, h3-packet-trace тощо |
| `INFO` | 9 | server lifecycle (start/stop), bind retries |
| `WARN` | 13 | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` | 17 | listener bind failed, hard protocol errors |

> **`TRACE` і `FATAL` навмисно відсутні.** `TRACE` не використовується; `FATAL` доставляється через
> `zend_error_noreturn(E_ERROR)`, який і так перериває процес.

## Використання

Логер вимкнено за замовчуванням. Щоб активувати, потрібні **обидва**:

1. Severity, відмінний від `OFF`.
2. Sink-stream через
   [`HttpServerConfig::setLogStream()`](/uk/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

Severity **фіксується на старті** — runtime-зміни не підтримуються (single-threaded lock-free
модель).

### Що чути на кожному рівні

```php
// production
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug нестабільності
$config->setLogSeverity(LogSeverity::INFO);

// глибокий debug
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` вмикає в тому числі детальне трасування HTTP/3-пакетів і інших внутрішніх потоків —
корисно для діагностики, але додає CPU/IO overhead.

## Див. також

- [`HttpServerConfig::setLogSeverity()`](/uk/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/uk/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Конфігурація — логування](/uk/docs/server/configuration.html#логування)
