---
layout: docs
lang: it
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /it/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity: enum dei livelli di logging del server. Basato su OpenTelemetry SeverityNumber."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum dei livelli di logging del server. I valori di backing seguono
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); ne viene esportato un sottoinsieme stabile.

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

| Case | Valore OTel | Cosa rientra |
|------|------------:|--------------|
| `OFF` | 0 | nulla |
| `DEBUG` | 5 | tracing, h3-packet-trace e altro |
| `INFO` | 9 | lifecycle del server (start/stop), retry di bind |
| `WARN` | 13 | fallimento dell'handshake TLS, peer reset, eccezioni assorbite |
| `ERROR` | 17 | bind del listener fallito, errori di protocollo non recuperabili |

> **`TRACE` e `FATAL` sono assenti di proposito.** `TRACE` non è usato; `FATAL` viene veicolato
> tramite `zend_error_noreturn(E_ERROR)`, che già termina il processo.

## Utilizzo

Il logger è disattivato di default. Per attivarlo servono **entrambi**:

1. Severity diversa da `OFF`.
2. Stream di sink tramite
   [`HttpServerConfig::setLogStream()`](/it/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

La severity viene **fissata all'avvio**: i cambi a runtime non sono supportati (modello
single-threaded lock-free).

### Cosa si sente a ogni livello

```php
// produzione
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug di instabilità
$config->setLogSeverity(LogSeverity::INFO);

// debug profondo
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` include anche il tracing dettagliato dei pacchetti HTTP/3 e di altri flussi interni: utile
per la diagnostica, ma aggiunge overhead CPU/IO.

## Vedi anche

- [`HttpServerConfig::setLogSeverity()`](/it/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/it/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Configurazione — Logging](/it/docs/server/configuration.html#logging)
