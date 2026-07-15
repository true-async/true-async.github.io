---
layout: docs
lang: ko
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /ko/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): RFC 6455 기반 전이중 연결, 워커 간 pub/sub 토픽, backpressure, keepalive, 서브프로토콜 협상, permessage-deflate."
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
- 프로세스의 모든 워커에 도달하는 [pub/sub 토픽](#topics-publishsubscribe-across-every-worker).
  덕분에 채팅에 단일 워커 서버나 외부 브로커가 필요 없습니다.

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

// 필수: 서버는 HTTP 핸들러 없이는 시작을 거부하며, 이 핸들러가
// upgrade가 아닌 요청에 응답합니다.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

핸들러를 등록하는 것이 WebSocket을 켜는 방법입니다 — 따로 젖혀야 할 스위치는 없으며, HTTP/2 및 `addHttp2Handler()`와 정확히 동일합니다.

> `HttpServerConfig::enableWebSocket()`은 그 스위치가 아니라 레거시 토글입니다. `true`를 전달하면
> `addWebSocketHandler()`를 가리키는 `HttpServerRuntimeException`을 던집니다 — 대신 핸들러를 등록하세요.

각 연결은 자체 코루틴으로 서비스되며, HTTP와 동일한 요청별 모델을 따릅니다.
핸들러가 예외를 던져도 워커가 함께 죽지는 않습니다: 예외는 로깅되고, peer에게는 프로토콜
내에서 알립니다 — throw가 upgrade보다 앞섰다면 HTTP 상태로, 세션이 이미 활성 상태였다면
`CLOSE 1011`로.

핸들러는 항상 세 개의 인수로 호출되며, 선언하지 않은 것은 PHP가 버립니다 — 따라서
`function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)`, 세 매개변수 형식이
모두 유효합니다. 사용하는 것만 선언하세요.

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

## 토픽: 모든 워커에 걸친 publish/subscribe {#topics-publishsubscribe-across-every-worker}

워커는 자체 PHP 컨텍스트를 가진 스레드입니다. 그래서 채팅을 만드는 뻔한 방법 — 연결 배열을
유지하며 순회하는 것 — 은 오직 *한* 워커의 peer에만 도달할 수 있으며, 이것이 그런 채팅을
`setWorkers(1)`에서 돌려야 했던 이유입니다.

토픽이 이를 해결합니다. 토픽은 핸들러가 아니라 서버에 존재합니다: 각 워커는 자신이 소유한
연결을 인덱싱하고, `publish()`는 모든 워커에 넘겨져 각 워커가 자신의 소켓으로 전달합니다.
Redis도, 메시지 브로커도, 단일 워커 서버도 없습니다.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // 모든 워커의 구독자에게 도달
    }
});
```

토픽은 **호출 지점에서 이름으로** 지정합니다. 획득하거나, 보유하거나, 핸들러에 전달할 토픽
객체는 없습니다.

### 필터는 MQTT를 따른다

레벨은 `/`로 구분되고, `+`는 정확히 한 레벨과 매칭되며, 끝의 `#`는 나머지 전부와 매칭됩니다:

| 필터 | 수신 대상 |
|--------|----------|
| `chat/general` | 정확히 그 토픽 |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — 한 레벨, 임의의 값 |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — 서브트리 전체 |

와일드카드는 *구독*에 속합니다. **publish 토픽은 반드시 구체적**이어야 합니다: 패턴으로
fan-out된 메시지는 잘 정의된 목적지가 없으므로 `publish('chat/+/typing', …)`은
`WebSocketException`을 던집니다. 필터는 최대 128레벨 깊이까지 가능합니다.

### API

```php
$ws->subscribe('chat/+/typing');            // idempotent
$ws->unsubscribe('chat/+/typing');          // idempotent
$ws->getTopics();                           // string[] — 이 연결의 필터

$ws->publish('chat/general', $text);        // 텍스트, 모든 워커로
$ws->publishBinary('chat/general', $bytes); // 바이너리 대응

$ws->subscriberCount('chat/general');       // 모든 워커에 걸쳐, 와일드카드 포함
```

`publish()`는 **절대 일시 중단하지 않습니다**. 아웃바운드 큐가 밀린 peer는 나머지 토픽으로의
전달을 막는 대신 메시지를 버립니다 — `trySend()`와 같은 시맨틱입니다. 전달 보장이 필요하면
해당 연결 하나에 `send()`하세요. 자신의 여러 필터에 의해 매칭된 구독자도 정확히 한 부만
받습니다.

`$excludeSelf`는 기본값이 `true`입니다 — 채팅이 원하는 "발신자를 제외한 모두" 경우:

```php
$ws->publish('chat/general', $msg->data);                      // 발신자는 되돌려받지 않음
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // 발신자도 받음
```

반환값은 **호출한 워커에서만** 처리된 구독자 수입니다. 다른 워커로의 전달은 비동기이고 호출
지점에서 셀 수 없으므로, 이것은 프로세스 전역이 아니라 로컬 수치입니다. `subscriberCount()`가
프로세스 전역 수치이지만 — 각 워커가 자신의 수치로 답하고 그 답들을 합산하므로, 실시간
카운터가 아니라 스냅샷이며, 제때 답하지 못한 워커는 빠집니다.

닫히는 연결은 스스로 모든 것을 구독 해제합니다.

### 한도

둘 다 기본값이 off이며, 이는 모든 self-hosted 브로커가 그렇습니다(EMQX `max_subscriptions` /
`messages_rate`, NATS `max_subs`): 얼마나 많은 토픽이 필요한지는 애플리케이션만 압니다.

```php
$config
    ->setWsMaxSubscriptions(32)          // 한 연결이 보유할 수 있는 서로 다른 필터
    ->setWsPublishRateLimit(50, burst: 100);
```

클라이언트 입력이 `subscribe()`에 닿을 때마다 — 예컨대 `$ws->subscribe($msg->data)` — 
`setWsMaxSubscriptions()`를 설정하세요. 그래야 peer가 워커의 토픽 트리를 끝없이 키우지
못합니다. 상한을 넘으면 `subscribe()`가 `WebSocketException`을 던지고 연결은 유지됩니다.

`setWsPublishRateLimit()`는 연결당 토큰 버킷입니다. `publish()`는 권한 없는 peer가 프로세스의
*모든* 워커에서 작업으로 바꿀 수 있는 유일한 WebSocket 호출입니다 — `send()`와 `trySend()`는
자신의 소켓만 건드립니다. 계량하지 않으면, 릴레이된 메시지를 루프로 돌리는 한 클라이언트가
모든 워커의 inbox를 채우고, 뒤따르는 drop이 *다른* 토픽의 트래픽까지 앗아갑니다. 속도를 넘으면
`publish()`가 `WebSocketBackpressureException`을 던지고 연결은 유지됩니다: 메시지가 아무도 볼
수 없는 가득 찬 mailbox로 사라지는 대신 발신자에게 알립니다.

`$burst`는 메시지 단위의 버킷 깊이입니다 — 핸들러가 지속 속도를 얼마나 앞질러 달릴 수 있는지.
`0`은 1초 분량을 의미합니다.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### 비용

각 워커는 자신의 구독을 토픽 prefix의 counting Bloom filter로 요약하고, publisher는 구독자를
확실히 보유하지 않은 워커를 깨우는 대신 건너뜁니다. 프로세스의 누구도 듣지 않는 토픽으로의
publish는 워커 간 wake-up 비용이 0입니다. `HttpServer::getRuntimeStats()`가 결과를 보고합니다 —
`ws_topic_posted`, `ws_topic_skipped`(필터가 제 값을 하는 것), `ws_topic_dropped`(워커의
mailbox가 가득 참: 이것은 데이터 손실).

토픽은 plaintext HTTP/1뿐 아니라 모든 WebSocket 전송에서 동작합니다 — TLS 위에서, HTTP/2
Extended CONNECT 위에서, 그리고 permessage-deflate와 함께, 여기서 하나의 `publish()`가 압축된
peer와 평문 peer를 각자 협상한 프레이밍으로 나란히 서비스합니다.

## 클라이언트의 주소

```php
$ws->getRemoteAddress();   // "203.0.113.7" 또는 "2001:db8::1" — 포트 없는 순수 IP
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()`는 **순수 IP**를 반환합니다: 포트도 없고, IPv6 리터럴을 감싸는 대괄호도
없습니다 — `$_SERVER['REMOTE_ADDR']`과 같은 형태이므로 `filter_var(…, FILTER_VALIDATE_IP)`,
ACL, 또는 rate limiter에 곧바로 넣을 수 있습니다. 둘 다 IP peer가 없는 Unix 소켓 리스너에서는
`null`을 반환합니다.

이것은 TCP 연결의 peer입니다. `X-Forwarded-For`에서 유도한 것이 **아닙니다** — 프록시 뒤에서는
그 헤더를 직접 파싱하되, 그것을 설정한 프록시를 신뢰할 때만 하세요.

> **Breaking change.** `getRemoteAddress()`는 예전에 `"host:port"`를(그리고 IP peer가 없을 때는
> `""`를) 반환했습니다. 이제는 순수 IP를, 그리고 `null`을 반환합니다. 포트는
> `getRemotePort()`를 사용하세요.

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
        └── TrueAsync\WebSocketException            // 잘못된 토픽 필터, 구독 상한도 여기
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // 느린 reader — 또는 rate limit을 넘긴 publish()
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
| `setWsMaxSubscriptions($count)` | `0` (무제한) | 한 연결이 보유할 수 있는 서로 다른 토픽 필터 |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | `publish()`에 대한 연결당 토큰 버킷 |

자세한 내용은 [설정: WebSocket](/ko/docs/server/configuration.html#websocket)을 참고하세요.

## 참고

- [`TrueAsync\WebSocket`과 관련 클래스](/ko/docs/reference/server/websocket.html): 전체
  레퍼런스
- [`HttpServer::addWebSocketHandler()`](/ko/docs/reference/server/http-server.html#addwebsockethandler)
- [설정: WebSocket](/ko/docs/server/configuration.html#websocket)
