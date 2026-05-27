---
layout: docs
lang: ru
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /ru/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — enum уровней логирования сервера. Backed by OpenTelemetry SeverityNumber."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum уровней логирования сервера. Backing-значения соответствуют
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); экспортируется стабильный подмножество.

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

| Case | OTel value | Что попадает |
|------|-----------:|--------------|
| `OFF` | 0 | ничего |
| `DEBUG` | 5 | трассировка, h3-packet-trace и пр. |
| `INFO` | 9 | server lifecycle (start/stop), bind retries |
| `WARN` | 13 | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` | 17 | listener bind failed, hard protocol errors |

> **`TRACE` и `FATAL` намеренно отсутствуют.** `TRACE` не используется; `FATAL` доставляется через
> `zend_error_noreturn(E_ERROR)`, который и так прерывает процесс.

## Использование

Logger выключен по умолчанию. Чтобы активировать, нужны **оба**:

1. Severity отличный от `OFF`.
2. Sink-stream через
   [`HttpServerConfig::setLogStream()`](/ru/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

Severity **фиксируется на старте** — runtime-смены не поддерживаются (single-threaded lock-free
модель).

### Что слышно на каждом уровне

```php
// production
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug нестабильности
$config->setLogSeverity(LogSeverity::INFO);

// глубокий debug
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` включает в том числе подробную трассировку HTTP/3-пакетов и других внутренних потоков —
полезно для диагностики, но добавляет CPU/IO overhead.

## См. также

- [`HttpServerConfig::setLogSeverity()`](/ru/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/ru/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Конфигурация — логирование](/ru/docs/server/configuration.html#логирование)
