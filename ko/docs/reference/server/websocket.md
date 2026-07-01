---
layout: docs
lang: ko
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /ko/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode, 그리고 WebSocket 예외 계층."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

RFC 6455 기반 전이중 연결을 다루는 클래스들입니다. 예제가 있는 가이드:
[WebSocket](/ko/docs/server/websocket.html).

## TrueAsync\WebSocket

하나의 WebSocket 연결. Upgrade 핸드셰이크가 커밋된 직후 서버가 생성하며,
[`HttpServer::addWebSocketHandler()`](/ko/docs/reference/server/http-server.html#addwebsockethandler)로
등록한 핸들러의 첫 번째 인수로 전달됩니다.

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

인스턴스는 서버만 생성합니다. `new WebSocket`은 사용자 코드에서 사용할 수 없습니다.

### 생명주기

연결은 핸들러 코루틴에 묶여 있습니다. 핸들러가 어떤 이유로든 제어를 반환하면(`recv()` 루프가
`null`을 받아 `return`하는 경우 포함) 서버는 코드 `1000 Normal`로 연결을 닫습니다.
`return` 전에 명시적으로 `close()`를 호출할 필요가 있는 경우는 기본이 아닌 코드나 이유
텍스트를 쓰고 싶을 때뿐입니다.

### 동시성 모델

- `send()`, `sendBinary()`, `ping()`은 같은 스레드의 어떤 코루틴에서 호출해도 안전합니다.
  생산자는 직렬화된 프레임을 원자적으로 큐에 넣고, 단일 협력형 flusher가 이를 한 번에 하나씩
  소켓에 씁니다. 그래서 서로 다른 호출자의 프레임이 섞이지 않습니다.
- `recv()`는 단일 리더입니다: 두 번째 동시 `recv()` 호출은
  `WebSocketConcurrentReadException`을 던집니다. 연결은 하나의 바이트 스트림이며 다중
  리더에 대한 정의된 의미가 없기 때문입니다.
- `close()`는 멱등이며 어떤 코루틴에서도 호출할 수 있습니다.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

다음 텍스트 또는 바이너리 메시지를 받습니다. 완전한 메시지가 도착하거나 연결이 닫힐 때까지
호출한 코루틴을 일시 중단합니다.

[`WebSocketMessage`](#websocketmessage)를 반환하거나, 클라이언트가 정상적으로 닫았을 때
`null`을 반환합니다: 정상 CLOSE 코드(`1000`/`1001`/`1005`) 또는 CLOSE 프레임 없는 단순
연결 끊김입니다. 전형적인 루프: `while (($m = $ws->recv()) !== null) { ... }`.

이 메서드가 던지는 예외:

- `WebSocketClosedException` — 프로토콜 오류나 명시적 오류 종료 코드일 때. `$closeCode`/
  `$closeReason`이 RFC 6455 코드와 이유를 전달합니다.
- `WebSocketConcurrentReadException` — 이 연결에서 다른 코루틴이 이미 `recv()` 안에서
  대기 중일 때.

### send

```php
public WebSocket::send(string $text): void
```

텍스트 프레임을 전송합니다. `$text`는 반드시 유효한 UTF-8이어야 합니다: 수신자가 RFC 6455
§5.6을 위반하는 프레임을 절대 보지 않도록 잘못된 데이터는 미리 거부됩니다.

전송 버퍼가 가득 차지 않은 일반적인 경우에는 즉시 제어를 반환합니다. 버퍼가 가득 차면 호출한
코루틴을 일시 중단하고, 클라이언트가 충분히 읽어 공간이 다시 생기면 재개합니다. 일시 중단이
`write_timeout_ms`보다 오래 지속되면 메서드는 `WebSocketBackpressureException`을 던지고,
핸들러는 메시지를 버리거나, 연결을 닫거나, 재시도할 수 있습니다.

연결이 이미 닫혀 있으면 `WebSocketClosedException`도 던집니다.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

바이너리 프레임을 전송합니다. 바이너리 payload에는 UTF-8 제약이 없습니다. Backpressure
동작은 `send()`와 동일합니다.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

비블로킹 전송. 전송 버퍼가 가득 차지 않았으면 텍스트 프레임을 큐에 넣고 `true`를 반환합니다.
버퍼가 가득 차면 아무것도 큐에 넣지 않고 `false`를 반환하므로, 호출자는 메시지를 버리거나,
속도를 늦추거나, 연결을 닫을 수 있습니다. `send()`와 달리 `trySend()`는 절대 호출한 코루틴을
일시 중단하지 않으므로, 한 느린 클라이언트가 다른 클라이언트로의 전달을 막아서는 안 되는
브로드캐스트 루프에 적합한 도구입니다.

버퍼 크기는
[`HttpServerConfig::setStreamWriteBufferBytes()`](/ko/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)로
설정합니다(`0`은 한도를 해제합니다: 그 경우 `trySend()`는 항상 프레임을 큐에 넣고 `true`를
반환합니다).

이 함수는 메시지가 큐에 받아들여지면 `true`를, 전송 버퍼가 가득 차서 클라이언트가 따라오지
못하면 `false`를 반환합니다. 연결이 이미 닫혀 있으면 `WebSocketClosedException`을 던집니다.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

비블로킹 바이너리 전송. `trySend()`와 동일하게 동작합니다.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

PING 프레임을 전송합니다. RFC 6455 §5.5.2에 따라 상대는 PONG으로 응답해야 합니다.
애플리케이션 코드가 이를 직접 호출해야 하는 경우는 드뭅니다: 설정되어 있으면 서버의
keepalive 타이머(`HttpServerConfig::setWsPingIntervalMs()`)가 자동으로 ping을 보냅니다.

`$payload`는 최대 125바이트를 받습니다(RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

종료 핸드셰이크를 시작하고 연결을 끊습니다. 멱등입니다: 반복 호출은 아무 동작도 하지
않습니다.

- `$code`는 `WebSocketCloseCode` 값이거나, `4000..4999` 범위의 원시 정수입니다(애플리케이션별
  코드용으로 예약됨, RFC 6455 §7.4.2).
- `$reason`은 최대 123바이트의 UTF-8 텍스트입니다.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`close()`가 호출된 이후, 또는 클라이언트의 CLOSE 프레임이 처리된 이후 `true`입니다.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Upgrade 중에 협상된 서브프로토콜. 선택된 것이 없으면 `null`입니다.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

TCP 연결의 경우 `host:port`(IPv4) 또는 `[host]:port`(IPv6) 형식의 상대 주소. Unix 소켓
연결의 경우 빈 문자열입니다.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

수동 `recv()` 루프 대신 `foreach ($ws as $msg)`를 쓸 수 있게 해줍니다. 각 단계마다 루프가
다음 메시지를 가져옵니다. 정상 종료는 단순히 `foreach`를 끝내고, 오류를 동반한 종료는 루프
밖으로 곧바로 `WebSocketClosedException`을 던집니다.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

`WebSocket::recv()`가 전달하는, 완전히 재조립된 메시지 하나. 텍스트 메시지는 이미 UTF-8로
검증되었으므로 다시 확인하지 않고 `$data`를 그대로 사용할 수 있습니다.

- **`$data`**: 메시지 payload. 텍스트 메시지의 경우 유효한 UTF-8 문자열입니다.
- **`$binary`**: 메시지가 바이너리 프레임으로 전송되었으면 `true`, 텍스트 프레임이면
  `false`입니다.

인스턴스는 서버만 생성합니다. `WebSocket::recv()`를 통해서만 얻을 수 있으며,
`new WebSocketMessage`를 직접 만들 방법은 없습니다.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

진행 중인 Upgrade 협상을 다루는 핸들입니다. 핸들러가 호출된 시점부터 `reject()`가
호출되거나 핸들러가 성공적으로 반환할 때까지 존재합니다(반환된 경우 서버는
`setSubprotocol()`로 선택된 서브프로토콜과 함께 `101`을 보냅니다).

세 개의 매개변수로 등록된 핸들러에서만 사용할 수 있습니다:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

서버는 핸들러가 선언한 매개변수 개수를 확인합니다. 매개변수가 두 개인 핸들러는 이 객체를
완전히 건너뛰며 Upgrade는 기본 설정으로 수락됩니다.

핸드셰이크가 커밋되면 이 객체에 대한 모든 호출은 예외를 던집니다: `Sec-WebSocket-Protocol`이
이미 와이어에 나갔고 서브프로토콜은 더 이상 바뀔 수 없습니다.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

주어진 HTTP 상태로 Upgrade를 거부합니다. `101` 응답은 전송되지 않으며, 클라이언트는 대신
선택된 상태를 받고 연결이 닫힙니다. `reject()` 이후 핸들러는 즉시 반환해야 합니다: 더 이상의
I/O는 허용되지 않습니다.

- `$status`: HTTP 상태 코드(4xx 또는 5xx여야 함).
- `$reason`: 선택적 응답 본문.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

클라이언트가 제안한 목록에서 서브프로토콜을 선택합니다. 선택된 값은 `Sec-WebSocket-Protocol`
응답 헤더로 그대로 반영됩니다. 핸들러가 반환하기 전, `reject()` 전에 호출해야 합니다. 서버는
선택된 값이 실제로 `getOfferedSubprotocols()`에 있었는지 검증하지 않습니다. 이는 핸들러의
책임입니다.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

클라이언트가 `Sec-WebSocket-Protocol` 헤더로 보낸 서브프로토콜(`string[]`)을 클라이언트가
선호하는 순서대로 반환합니다. 클라이언트가 아무것도 제안하지 않았으면 빈 배열입니다.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

`Sec-WebSocket-Extensions` 헤더의 확장(`string[]`)을 클라이언트가 선호하는 순서대로
반환합니다. permessage-deflate(RFC 7692, 메시지 압축)는
`HttpServerConfig::setWsPermessageDeflate()`를 통해 서버 자체가 협상하며, 나머지 제안된
값은 정보 제공 목적일 뿐입니다. 클라이언트가 아무것도 제안하지 않았으면 빈 배열입니다.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

RFC 6455 §7.4.1의 종료 코드 레지스트리입니다. 애플리케이션별 코드(`4000..4999`, RFC 6455
§7.4.2)도 계속 사용할 수 있습니다: `WebSocket::close()`는 이 enum과 함께 원시 `int`도
받습니다.

## 예외

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

모든 WebSocket 오류의 베이스 예외입니다. 프로젝트 전체의 `HttpServerException`을
상속하므로, 기존 catch-all 핸들러가 계속 동작합니다.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

클라이언트가 시작한 정상 핸드셰이크가 아닌 다른 이유로 연결이 닫혔습니다: 프로토콜 오류거나
클라이언트로부터의 명시적 오류 코드입니다. `$closeCode`는 RFC 6455 종료 코드를 전달합니다
(CLOSE 프레임이 전혀 오지 않았다면, 예를 들어 네트워크가 끊긴 경우 `1006 Abnormal Closure`).
`$closeReason`은 클라이언트의 CLOSE 프레임에 담긴 UTF-8 이유 텍스트를 전달하며, 없으면 빈
문자열입니다.

클라이언트에 의한 정상 종료(코드 `1000`)는 예외를 던지지 않습니다: 그 경우
`WebSocket::recv()`는 단순히 `null`을 반환합니다.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

전송 버퍼가 `write_timeout_ms`보다 오래 가득 찬 상태로 유지될 때 `send()`/`sendBinary()`에서
던져집니다. 이는 클라이언트가 너무 느리게 읽고 있다는 애플리케이션에 대한 신호입니다: 연결을
닫거나, 메시지를 버리고 계속하세요.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

프로그래머 오류입니다: 다른 코루틴이 이미 같은 `WebSocket`에서 `recv()` 안에 대기 중일 때
두 번째 코루틴이 `recv()`를 호출했습니다. 하나의 연결은 한 번에 한 곳에서만 읽을 수 있습니다.
메시지를 여러 핸들러에 분배해야 한다면 `recv()` 루프 하나를 만들고 그 안에서 직접 메시지를
분배하세요.

## 참고

- [가이드: WebSocket](/ko/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/ko/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: WebSocket 옵션](/ko/docs/reference/server/http-server-config.html#websocket)
- [TrueAsync Server 예외](/ko/docs/reference/server/exceptions.html)
