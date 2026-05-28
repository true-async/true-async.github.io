---
layout: docs
lang: ko
path_key: "/docs/reference/server/log-severity.html"
nav_active: docs
permalink: /ko/docs/reference/server/log-severity.html
page_title: "TrueAsync\\LogSeverity"
description: "TrueAsync\\LogSeverity — 서버 로깅 레벨 enum. OpenTelemetry SeverityNumber 기반."
---

# TrueAsync\LogSeverity

(PHP 8.6+, true_async_server 0.6+)

서버 로깅 레벨 enum. backing 값은
[OpenTelemetry Logs Data Model SeverityNumber](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)
(1..24)에 해당합니다. 안정적인 부분 집합이 export됩니다.

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

| Case | OTel value | 무엇이 기록되는가 |
|------|-----------:|--------------|
| `OFF` | 0 | 없음 |
| `DEBUG` | 5 | 트레이싱, H3 패킷 트레이스 등 |
| `INFO` | 9 | 서버 lifecycle (start/stop), bind retries |
| `WARN` | 13 | TLS handshake 실패, peer reset, 흡수된 예외 |
| `ERROR` | 17 | listener bind 실패, 하드한 프로토콜 오류 |

> **`TRACE`와 `FATAL`은 의도적으로 없습니다.** `TRACE`는 사용되지 않습니다. `FATAL`은 이미
> 프로세스를 종료시키는 `zend_error_noreturn(E_ERROR)`를 통해 전달됩니다.

## 사용

로거는 기본적으로 꺼져 있습니다. 활성화하려면 다음 **둘 다** 필요합니다.

1. `OFF`이 아닌 severity.
2. [`HttpServerConfig::setLogStream()`](/ko/docs/reference/server/http-server-config.html#setlogstream-getlogstream)을
   통한 sink stream.

```php
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);
```

severity는 **시작 시 고정**됩니다 — 런타임 변경은 지원되지 않습니다 (단일 스레드 lock-free 모델).

### 각 레벨에서 들리는 것

```php
// 프로덕션
$config->setLogSeverity(LogSeverity::WARN);

// 스테이징 / 불안정성 디버그
$config->setLogSeverity(LogSeverity::INFO);

// 깊은 디버그
$config->setLogSeverity(LogSeverity::DEBUG);
```

`DEBUG`는 HTTP/3 패킷과 기타 내부 흐름의 상세 트레이싱을 포함합니다 — 진단에 유용하지만 CPU/IO
오버헤드가 추가됩니다.

## 참고

- [`HttpServerConfig::setLogSeverity()`](/ko/docs/reference/server/http-server-config.html#setlogseverity-getlogseverity)
- [`HttpServerConfig::setLogStream()`](/ko/docs/reference/server/http-server-config.html#setlogstream-getlogstream)
- [구성 — 로깅](/ko/docs/server/configuration.html#로깅)
