---
layout: docs
lang: ko
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /ko/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): RFC 6455 기반 전이중 연결, backpressure, keepalive, 서브프로토콜 협상, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()`는 RFC 6455 기반 전이중 연결을 위한 핸들러를 등록합니다.

연결은 일반 HTTP 요청으로 시작하고, 이후 클라이언트가 같은 TCP 연결을 다른 프로토콜로
전환해 달라고 서버에 요청합니다. 이것이 Upgrade입니다. 서버는 `101 Switching Protocols`
상태로 응답하며, 그 시점부터 같은 연결은 HTTP가 아니라 WebSocket을 전달합니다. 지원 항목:

- HTTP/1.1에서의 Upgrade(전통적인 `Connection: Upgrade` 헤더).
- HTTP/2에서의 Upgrade(RFC 8441 Extended CONNECT).
- `wss://`(TLS 위의 WebSocket).
- permessage-deflate(RFC 7692), 메시지 단위 압축.

> 구현은 Autobahn|Testsuite 준수성 스위트로 검증되었으며 `behavior` 카테고리의 246개 테스트를
> 모두 통과합니다.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

$server->start();
```

각 연결은 자체 코루틴으로 서비스되며, HTTP와 동일한 요청별 모델을 따릅니다.

## 생명주기

연결은 핸들러 코루틴이 반환할 때까지 열려 있습니다. 핸들러가 그냥 끝나면(예를 들어
`recv()`/`foreach` 루프가 마지막에 `null`을 받은 경우) 서버는 코드 `1000 Normal`로 자동으로
연결을 닫습니다. `return` 전에 명시적으로 `close()`를 호출할 필요가 있는 경우는 다른 코드나
자신만의 이유 텍스트를 쓰고 싶을 때뿐입니다.

## 메시지 수신: `recv()`와 `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

다음 메시지가 도착하거나 연결이 닫힐 때까지 코루틴을 일시 중단합니다.
[`WebSocketMessage`](/ko/docs/reference/server/websocket.html#websocketmessage)를 반환하거나,
클라이언트가 정상적으로 연결을 닫았을 때(정상 종료 코드, 또는 명시적 CLOSE 프레임 없는
연결 끊김) `null`을 반환합니다:

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket`은 `\Iterator`를 구현하므로 같은 루프를 더 간결하게
`foreach ($ws as $msg) { ... }`로 쓸 수 있습니다. 정상 종료는 단순히 `foreach`를 끝내고,
오류를 동반한 종료는 루프 밖으로 곧바로 `WebSocketClosedException`을 던집니다.

메시지는 한 곳에서만 읽으세요: 같은 연결에서 두 코루틴이 동시에 `recv()`를 호출하면 두 번째
호출은 `WebSocketConcurrentReadException`을 던집니다. 메시지를 여러 핸들러에 분배해야 한다면
`recv()` 루프 하나를 유지하고 그 안에서 직접 분배하세요.

## 메시지 전송: `send()`, `trySend()`

`send()`와 `sendBinary()`는 여러 코루틴에서 동시에 호출해도, 어떤 코루틴에서 호출해도
안전합니다: 서버는 서로 다른 호출의 데이터가 와이어에서 섞이지 않도록 보장합니다.

```php
$ws->send('text frame');       // 텍스트는 반드시 유효한 UTF-8이어야 함
$ws->sendBinary($binaryData);  // 바이너리 데이터에는 인코딩 제약 없음
```

보통 이 함수들은 즉시 반환됩니다. 클라이언트가 느리게 읽어서 전송 버퍼가 가득 차면 코루틴은
일시 중단되고, 클라이언트가 버퍼를 어느 정도 비우면 재개됩니다. 대기가
`write_timeout_ms`보다 길어지면 `WebSocketBackpressureException`이 던져지며, 핸들러는
메시지를 버리거나, 연결을 닫거나, 재시도할지 결정합니다.

한 느린 클라이언트가 나머지를 막지 않아야 하는 다수 클라이언트 브로드캐스트를 위해 비블로킹
버전도 있습니다:

```php
if (!$ws->trySend($text)) {
    // 이 클라이언트의 버퍼가 가득 참, 메시지는 전송되지 않았음, 클라이언트가 뒤처지고 있음
}
```

`trySend()`/`trySendBinary()`는 절대 코루틴을 일시 중단하지 않습니다: 메시지가 받아들여지면
즉시 `true`를 반환하고, 버퍼가 가득 차면 `false`를 반환합니다(이 경우 메시지는 그냥
전송되지 않습니다). 버퍼 크기는
[`HttpServerConfig::setStreamWriteBufferBytes()`](/ko/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)로
설정합니다(`0`은 한도를 해제합니다: `trySend()`는 항상 전송하고 `true`를 반환합니다).

## 연결 닫기: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

연결 종료를 시작합니다. 두 번 이상 호출해도 안전합니다: 이후 호출은 아무 동작도 하지 않습니다.
종료 코드는 [`WebSocketCloseCode`](/ko/docs/reference/server/websocket.html#websocketclosecode)
값이거나 `4000..4999` 범위의 정수입니다(애플리케이션별 코드용으로 예약됨). `$reason`은 최대
123바이트의 UTF-8 텍스트를 받습니다.

`isClosed()`는 `close()` 호출 이후, 또는 클라이언트가 자체 종료 신호를 보낸 이후 `true`를
반환합니다.

## Ping과 keepalive

```php
$ws->ping('optional payload');   // 최대 125바이트, RFC 6455 §5.5
```

애플리케이션 코드가 이를 직접 호출해야 하는 경우는 드뭅니다: 서버의 keepalive 타이머
(`HttpServerConfig::setWsPingIntervalMs()`)가 자동으로 PING을 보냅니다. 클라이언트가 제때
응답하지 않으면(`setWsPongTimeoutMs()`) 서버가 알아서 연결을 닫습니다. 자세한 내용은
[설정](/ko/docs/server/configuration.html#websocket)을 참고하세요.

## 서브프로토콜 협상과 거부: `WebSocketUpgrade`

기본적으로 핸들러는 `WebSocket $ws`만 받습니다. 연결을 받아들일지, 어떤 서브프로토콜을
선택할지 직접 결정하려면 핸들러를 세 개의 매개변수로 등록하세요: 서버가 매개변수 개수를
감지해서 그 경우 세 번째 객체인 `WebSocketUpgrade`를 전달합니다:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // Sec-WebSocket-Protocol 헤더로부터

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // return이나 reject() 전에 호출해야 함

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade`는 핸들러가 호출된 시점부터 `reject()` 또는 성공적인 `return`까지
존재합니다(그 시점에 서버가 선택된 서브프로토콜로 핸드셰이크를 마칩니다). 이후 이 객체에
대한 모든 호출은 예외를 던집니다: 응답이 이미 와이어에 나갔고 서브프로토콜은 더 이상 바뀔
수 없습니다.

`getOfferedExtensions()`는 클라이언트가 제안한 확장 목록을 반환합니다. permessage-deflate
(RFC 7692, 메시지 압축)는 `HttpServerConfig::setWsPermessageDeflate()`를 통해 서버 자체가
협상하며, 나머지 제안된 값은 정보 제공 목적일 뿐입니다.

## 종료 코드와 예외

`WebSocketCloseCode`는 표준 RFC 6455 종료 코드(`NORMAL`, `GOING_AWAY`, `PROTOCOL_ERROR`,
`MESSAGE_TOO_BIG` 등)를 가진 enum입니다. 예외 계층:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // 클라이언트가 충분히 빠르게 읽지 못함
              └── WebSocketConcurrentReadException  // 두 번째 recv()가 동시에 호출됨
```

클라이언트에 의한 정상 종료는 예외가 아니라 `recv()`의 `null`로 나타납니다. 예외는 프로토콜
오류나 명시적 오류 코드를 동반한 종료에서만 던져지며, `$closeCode`/`$closeReason`이 그 이유를
전달합니다. 자세한 내용은 [레퍼런스](/ko/docs/reference/server/websocket.html)를 참고하세요.

## 설정

| 메서드 | 기본값 | 용도 |
|--------|---------|---------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | 최대 재조립 메시지 크기, 초과 시 `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | 단일 프레임의 최대 크기, 작은 조각의 홍수를 방지 |
| `setWsPingIntervalMs($ms)` | 30000 | 서버가 idle 연결에 ping을 보내는 주기, `0`은 비활성화 |
| `setWsPongTimeoutMs($ms)` | 60000 | 닫기(`1001`) 전에 PONG을 기다리는 시간 |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, CPU 비용 때문에 opt-in |

자세한 내용은 [설정: WebSocket](/ko/docs/server/configuration.html#websocket)을 참고하세요.

## 참고

- [`TrueAsync\WebSocket`과 관련 클래스](/ko/docs/reference/server/websocket.html): 전체
  레퍼런스
- [`HttpServer::addWebSocketHandler()`](/ko/docs/reference/server/http-server.html#addwebsockethandler)
- [설정: WebSocket](/ko/docs/server/configuration.html#websocket)
