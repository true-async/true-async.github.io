---
layout: docs
lang: zh
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /zh/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity —— 服务器日志级别枚举，基于 OpenTelemetry SeverityNumber。"
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

服务器日志级别枚举。backing 值对应
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
（1..24）；这里导出的是一个稳定子集。

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

| Case | OTel 值 | 输出内容 |
|------|--------:|----------|
| `OFF` | 0 | 不输出 |
| `DEBUG` | 5 | 跟踪日志，h3-packet-trace 等 |
| `INFO` | 9 | 服务器生命周期（start/stop）、bind 重试 |
| `WARN` | 13 | TLS 握手失败、peer reset、被吸收的异常 |
| `ERROR` | 17 | listener bind 失败、协议级硬错误 |

> **`TRACE` 与 `FATAL` 是有意没有的。** `TRACE` 没用到；`FATAL` 走 `zend_error_noreturn(E_ERROR)`，
> 那条路径本身就会终止进程。

## 使用

Logger 默认关闭。要启用，需要**同时**满足两点：

1. severity 不是 `OFF`。
2. 通过
   [`HttpServerConfig::setLogStream()`](/zh/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
   设置 sink stream。

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

severity **在启动时固定**，运行时不可切换（单线程 lock-free 模型）。

### 各级别能看到什么

```php
// 生产
$config->setLogSeverity(LogSeverity::WARN);

// 预发 / 排查抖动
$config->setLogSeverity(LogSeverity::INFO);

// 深度调试
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG` 会输出 HTTP/3 包级别等详细内部流的跟踪 —— 排错时有用，但带来 CPU/IO 开销。

## 也可参考

- [`HttpServerConfig::setLogSeverity()`](/zh/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/zh/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [配置 —— 日志](/zh/docs/server/configuration.html#日志)
