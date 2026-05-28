---
layout: docs
lang: de
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /de/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — Enum der Logging-Level des Servers. Basiert auf OpenTelemetry SeverityNumber."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum der Logging-Level des Servers. Die Backing-Werte entsprechen
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); exportiert wird eine stabile Teilmenge.

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

| Case | OTel-Wert | Was geloggt wird |
|------|----------:|------------------|
| `OFF` | 0 | nichts |
| `DEBUG` | 5 | Tracing, H3-Packet-Trace u. a. |
| `INFO` | 9 | Server-Lifecycle (start/stop), Bind-Retries |
| `WARN` | 13 | TLS-Handshake-Fehler, Peer-Reset, absorbierte Exceptions |
| `ERROR` | 17 | Listener-Bind-Failures, harte Protokollfehler |

> **`TRACE` und `FATAL` fehlen bewusst.** `TRACE` wird nicht verwendet; `FATAL` wird über
> `zend_error_noreturn(E_ERROR)` ausgeliefert, was den Prozess ohnehin beendet.

## Verwendung

Der Logger ist standardmäßig deaktiviert. Zur Aktivierung müssen **beide** gesetzt sein:

1. Severity ungleich `OFF`.
2. Sink-Stream über
   [`HttpServerConfig::setLogStream()`](/de/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

Die Severity wird **beim Start festgeschrieben** — Laufzeit-Änderungen sind nicht möglich
(Single-Threaded Lock-Free-Modell).

### Was auf jeder Stufe sichtbar wird

```php
// production
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug von Instabilitäten
$config->setLogSeverity(LogSeverity::INFO);

// tiefer Debug
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` aktiviert unter anderem detailliertes Tracing von HTTP/3-Paketen und weiteren internen
Flows — nützlich für die Diagnose, fügt aber CPU/IO-Overhead hinzu.

## Siehe auch

- [`HttpServerConfig::setLogSeverity()`](/de/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/de/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Konfiguration — Logging](/de/docs/server/configuration.html#logging)
