---
layout: docs
lang: es
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /es/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity: enum de niveles de logging del servidor. Respaldado por SeverityNumber de OpenTelemetry."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum de niveles de logging del servidor. Los valores de respaldo corresponden a
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24); se exporta un subconjunto estable.

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

| Case | Valor OTel | Qué entra |
|------|-----------:|-----------|
| `OFF` | 0 | nada |
| `DEBUG` | 5 | trazado, h3-packet-trace, etc. |
| `INFO` | 9 | ciclo de vida del servidor (start/stop), reintentos de bind |
| `WARN` | 13 | fallo de TLS handshake, peer reset, excepciones absorbidas |
| `ERROR` | 17 | fallo de bind de listener, errores duros de protocolo |

> **`TRACE` y `FATAL` se omiten adrede.** `TRACE` no se utiliza; `FATAL` viaja a través de
> `zend_error_noreturn(E_ERROR)`, que ya aborta el proceso.

## Uso

El logger está desactivado por defecto. Para activarlo hacen falta **ambas cosas**:

1. Severity distinta de `OFF`.
2. Stream-sink mediante
   [`HttpServerConfig::setLogStream()`](/es/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

La severity **queda fijada al arrancar**; no se admiten cambios en runtime (modelo
single-threaded lock-free).

### Qué se oye en cada nivel

```php
// producción
$config->setLogSeverity(LogSeverity::WARN);

// staging / depuración de inestabilidad
$config->setLogSeverity(LogSeverity::INFO);

// debug profundo
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` incluye también un trazado detallado de los paquetes HTTP/3 y de otros flujos internos:
útil para diagnóstico, pero añade overhead de CPU/IO.

## Véase también

- [`HttpServerConfig::setLogSeverity()`](/es/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/es/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Configuración, logging](/es/docs/server/configuration.html#logging)
