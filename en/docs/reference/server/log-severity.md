---
layout: docs
lang: en
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /en/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — enum of server logging levels. Backed by OpenTelemetry SeverityNumber."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum of server logging levels. The backing values correspond to
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); a stable subset is exposed.

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

| Case | OTel value | Contents |
|------|-----------:|----------|
| `OFF` | 0 | nothing |
| `DEBUG` | 5 | tracing, H3 packet trace, etc. |
| `INFO` | 9 | server lifecycle (start/stop), bind retries |
| `WARN` | 13 | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` | 17 | listener bind failed, hard protocol errors |

> **`TRACE` and `FATAL` are intentionally absent.** `TRACE` is unused; `FATAL` is delivered via
> `zend_error_noreturn(E_ERROR)`, which already terminates the process.

## Usage

The logger is disabled by default. To enable it, you need **both**:

1. A severity other than `OFF`.
2. A sink stream via
   [`HttpServerConfig::setLogStream()`](/en/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

Severity is **fixed at start** — runtime changes are not supported (single-threaded lock-free
model).

### What you hear at each level

```php
// production
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug instability
$config->setLogSeverity(LogSeverity::INFO);

// deep debug
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` also enables verbose tracing of HTTP/3 packets and other internal flows — useful for
diagnostics, but it adds CPU/IO overhead.

## See also

- [`HttpServerConfig::setLogSeverity()`](/en/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/en/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Configuration — logging](/en/docs/server/configuration.html#logging)
