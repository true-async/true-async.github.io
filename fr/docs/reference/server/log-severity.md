---
layout: docs
lang: fr
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /fr/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — enum des niveaux de logging serveur. Backed by SeverityNumber OpenTelemetry."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

Enum des niveaux de logging du serveur. Les valeurs backing correspondent à
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24) ; un sous-ensemble stable est exporté.

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

| Case | Valeur OTel | Ce qui est journalisé |
|------|------------:|-----------------------|
| `OFF` | 0 | rien |
| `DEBUG` | 5 | tracing, h3-packet-trace, etc. |
| `INFO` | 9 | lifecycle serveur (start/stop), bind retries |
| `WARN` | 13 | échec de handshake TLS, peer reset, exceptions absorbées |
| `ERROR` | 17 | listener bind failed, erreurs protocole graves |

> **`TRACE` et `FATAL` sont volontairement absents.** `TRACE` n'est pas utilisé ; `FATAL` est
> livré via `zend_error_noreturn(E_ERROR)`, qui interrompt déjà le processus.

## Utilisation

Le logger est désactivé par défaut. Pour l'activer, il faut **les deux** :

1. Une severity différente de `OFF`.
2. Un sink-stream via
   [`HttpServerConfig::setLogStream()`](/fr/docs/reference/server/http-server-config.html#setlogstream-getlogstream).

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

La severity est **figée au démarrage** — les changements runtime ne sont pas supportés (modèle
mono-thread lock-free).

### Ce qu'on entend à chaque niveau

```php
// production
$config->setLogSeverity(LogSeverity::WARN);

// staging / debug d'instabilités
$config->setLogSeverity(LogSeverity::INFO);

// debug profond
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` active notamment le tracing détaillé des paquets HTTP/3 et d'autres flux internes — utile
pour le diagnostic, mais ajoute un overhead CPU/IO.

## Voir aussi

- [`HttpServerConfig::setLogSeverity()`](/fr/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/fr/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [Configuration — logging](/fr/docs/server/configuration.html#logging)
