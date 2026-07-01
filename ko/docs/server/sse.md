---
layout: docs
lang: ko
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /ko/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): HTTP/1.1, HTTP/2, HTTP/3 위에서 바로 쓸 수 있는 text/event-stream 헬퍼."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE(Server-Sent Events)는 일반 HTTP 연결을 통해 브라우저로 텍스트 이벤트를 스트리밍하는 간단한
방법입니다. 방향은 서버에서 브라우저로 한쪽뿐입니다. WebSocket과 달리 별도의 프로토콜이나
Upgrade 핸드셰이크가 필요 없습니다: 서버는 그냥 응답을 열어 둔 채로 새 이벤트가 준비될 때마다
추가합니다. 브라우저는 내장 `EventSource` API로 이를 소비하며, 별도 라이브러리가 필요하지
않습니다.

`HttpResponse`는 `text/event-stream`을 위한 네 가지 메서드를 제공합니다: `sseStart()`,
`sseEvent()`, `sseComment()`, `sseRetry()`. 이는 같은
[`send()` 파이프라인](/ko/docs/server/streaming.html) 위의 얇은 포맷팅 계층이므로, 같은
핸들러가 HTTP/1.1, HTTP/2, HTTP/3에서 변경 없이 동작하며, 프로토콜은 클라이언트가 선택합니다.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // 장기 실행 스트림: write 데드라인 없음

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // 선택 사항: 첫 sseEvent()/sseComment()도 스트림을 시작함
    $res->sseRetry(3000);      // 연결이 끊기면 3초 후 재연결하도록 브라우저에 힌트
    $res->sseComment('stream open');   // 하트비트, 프록시가 연결을 idle로 끊지 않도록 유지

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // 클라이언트가 사라짐, 기다릴 필요 없음
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

브라우저 측:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

응답을 SSE 모드로 전환하고 헤더를 고정합니다: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`(마지막 헤더는 nginx에
응답을 버퍼링하지 말라고 알립니다. 없으면 이벤트가 프록시 버퍼가 찰 때까지 지연됩니다). 응답은
압축 불가로도 표시됩니다: 버퍼링하는 gzip 스트림은 실시간 전달이라는 목적 자체를 무너뜨리기
때문입니다.

호출은 선택 사항입니다: 첫 `sseEvent()`/`sseComment()`가 스트림을 스스로 시작합니다. 다만
`sseStart()` 단독으로는 상태 줄과 헤더를 와이어에 플러시하지 **않습니다**. 커밋은 지연되어
첫 실제 이벤트에서 이루어집니다. 스트림을 즉시 열고 싶다면(예를 들어 실제 이벤트가 준비되기
전에 브라우저의 `onopen`을 먼저 해제하려는 경우), 빈 `sseComment()`를 보내세요: 이는 스트림을
시작함과 동시에 헤더를 즉시 커밋합니다.

핸들러가 이미 자체 `Content-Type`을 설정한 경우 `HttpServerInvalidArgumentException`을
던지고, 응답이 이미 스트리밍 중이거나 닫혔거나 `sendFile()`로 사용 중인 경우
`HttpServerRuntimeException`을 던집니다.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

SSE 이벤트 하나를 포맷하여 전송하며, 필요하면 스트림을 시작합니다. 여러 줄로 된 `$data`는
`\n` / `\r\n` / `\r` 기준으로 나뉘어 여러 개의 `data:` 필드로 전송됩니다(WHATWG §9.2).
`$event`, `$id`, `$retry`는 `null`이 아닐 때만 포함됩니다. 레코드는 빈 줄로 끝나서 브라우저가
바로 이벤트를 디스패치합니다.

- `$event`와 `$id`는 `\r`/`\n`을 포함해서는 안 됩니다(그렇지 않으면 파서가 이를 필드/레코드
  구분자로 읽습니다). `$id`는 NUL을 포함해서는 안 됩니다(WHATWG에 따르면 NUL이 있으면 파서가
  id 전체를 무시합니다). 위반 시 `HttpServerInvalidArgumentException`을 던집니다.
- `$retry`는 음수가 아니어야 합니다.
- 빈 문자열 `$data === ''`도 유효한 값이며, 빈 `MessageEvent`를 디스패치합니다.
- 네 인수 모두 `null`이면 아무 동작도 하지 않습니다. `EventSource` 파서는 `data`도 `retry`도
  없는 이벤트를 조용히 건너뜁니다.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

주석 줄(`:`로 시작하는 레코드)을 전송합니다. 브라우저는 주석을 무시하지만, 중간 프록시의
idle 타임아웃(nginx의 `proxy_read_timeout`, 기본 60초)을 통과해 연결을 살아 있게 유지합니다.
하트비트로 주기적으로 호출하세요. 표준 payload는 빈 문자열이며, 와이어에서는 `:\n\n`이 됩니다.
`$text`는 `\r`/`\n`을 포함해서는 안 됩니다.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

스트림이 끊긴 후 몇 밀리초 뒤에 재연결할지 브라우저에 알리는 `retry:` 지시자를 전송합니다.
payload 없이 `sseEvent(retry: $milliseconds)`를 호출하는 것의 syntactic sugar입니다.

## Backpressure: `sendable()`

`send()`와 마찬가지로 모든 SSE 메서드는 실제 backpressure 상황, 즉 스트림의 중간 버퍼가 가득
찼을 때만 핸들러 코루틴을 일시 중단합니다. `sendable()` 검사는 비블로킹이며 권고적입니다:
`false`는 다음 호출이 일시 중단되거나, 응답이 이미 닫혔거나, 이 응답 유형이 스트리밍을 전혀
지원하지 않는다는 뜻입니다. 다른 작업이 있을 때 느린 클라이언트를 기다리지 않아도 되어
유용합니다.

## 참고

- 레퍼런스의 [`HttpResponse::sseStart()`](/ko/docs/reference/server/http-response.html#ssestart)와
  그 외 SSE 메서드
- [스트리밍](/ko/docs/server/streaming.html): SSE의 기반이 되는 저수준 `send()`/`sendable()`
- [예제](/ko/docs/server/examples.html#sse-server-sent-events)
