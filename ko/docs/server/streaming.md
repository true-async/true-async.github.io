---
layout: docs
lang: ko
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /ko/docs/server/streaming.html
page_title: "TrueAsync Server: 요청과 응답 스트리밍"
description: "readBody(): 요청 본문을 블록 단위로 읽기. send()/sendable(): backpressure를 갖춘 블록 단위 응답 전송. HTTP/2 트레일러."
---

# 요청과 응답 스트리밍

(PHP 8.6+, true_async_server 0.6+)

## 요청 본문을 블록 단위로 읽기: `readBody()`

기본적으로 핸들러는 이미 완전히 읽힌 본문(`HttpRequest::getBody()`)을 받습니다.
`HttpServerConfig::setBodyStreamingEnabled(true)`를 사용하면 H1/H2 파서가 DATA 블록을 요청별
FIFO 큐에 넣고, 핸들러는 `HttpRequest::readBody()`로 하나씩 가져옵니다.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
);

$server->addHttpHandler(function ($req, $res) {
    $fp = fopen('/tmp/upload-' . bin2hex(random_bytes(8)), 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($fp, $chunk);
        $total += strlen($chunk);
    }
    fclose($fp);

    $res->json(['received' => $total]);
});

$server->start();
```

### 시맨틱

- `readBody()` 한 번의 호출은 파서에서 받은 **하나의** 블록을 반환합니다.
  - H2의 DATA 프레임 (기본 최대 16 KiB);
  - llhttp `on_body`의 단편 (H1 읽기 버퍼 = 8 KiB로 제한).
- 큐가 비어 있으면 코루틴은 요청 트리거 이벤트에서 대기합니다.
- 스트림 끝에 도달하면 `null`을 반환합니다 (멱등).
- 스트림 오류(peer reset, `max_body_size` 초과) 시 `\Exception`이 던져집니다.
- `$maxLen` 매개변수는 현재 향후의 블록 병합용으로 예약되어 있으며 무시됩니다. 시그니처는
  추후 마무리(issue #26)와 바이너리 호환됩니다.

### 언제 켤까

- 큰 파일 업로드 (로그, 미디어, 백업).
- 스트리밍 파싱 (NDJSON, MessagePack 스트림).
- 본문을 메모리에 보관해서 tail latency(p99)가 악화되는 서비스.
- multipart는 `setBodyStreamingEnabled()`와 상관없이 **항상** 스트림으로 처리됩니다.

**끄지 말아야 할 때**: 본문이 작아서 `getBody()`/`getPost()`/`getQuery()`로 통째로 다루는 것이
편리한 REST 엔드포인트. 결합 모드(본문이 X 이상일 때만 스트림)는 지원되지 않습니다.
스트리밍 모드에서 `getBody()`는 `LogicException`을 던집니다 (로드맵에 포함).

### 메모리 소비

50개의 동시 20 MiB POST 요청에서 (h2load, WSL2): 피크 RSS가 1170 MiB → **197 MiB**로 떨어집니다
(6배). 처리량은 36 req/s → **100 req/s** (×2.7) — 핸들러 호출이 더 이상 전체 본문을 기다리지
않기 때문입니다.

## 응답을 블록 단위로 전송: `send()` / `sendable()`

`setBody()` / `json()` / `html()` / `redirect()`를 통한 단순 응답은 한 덩어리로 전송됩니다.

스트림 전송(H1의 chunked 전송, H2의 DATA 프레임)에는 `send($chunk)`를 사용합니다.

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: 이벤트가 클라이언트에 즉시 도달해야 함

    // 첫 send()가 상태와 헤더를 커밋함 (이후 변경 불가)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()`는 backpressure 상태에서 **만** 핸들러 코루틴을 일시 중단합니다: 스트림의 중간 버퍼가
가득 찼을 때입니다. 일반적인 상황에서는 즉시 제어를 반환합니다.

HTTP/2: 링 버퍼 슬롯이 가득 차거나 `HttpServerConfig::setStreamWriteBufferBytes()`(기본 256 KiB)를
초과할 때 backpressure가 활성화됩니다.
HTTP/1 chunked는 커널의 시스템 송신 버퍼를 사용합니다.

### `sendable()`

권고적 비블로킹 검사: `send()`가 코루틴을 중단시키지 않고 블록을 받아들이면 `true`를 반환합니다.
`false`는 셋 중 하나를 의미합니다: `send()`가 중단됨, 응답이 닫혔거나 `sendFile()` 호출로
봉인됨, 또는 스트림 전송을 지원하지 않는 응답 유형.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // 느린 클라이언트를 기다리고 싶지 않다 — 다른 일을 하자
        $event->save();   // DB에 기록
        continue;
    }
    $res->send($event->encode());
}
```

`send()`는 `sendable()`과 무관하게 **항상** 안전하게 호출할 수 있습니다. 후자는 단지 핸들러에
느린 클라이언트를 기다리는 대신 다른 일을 할 기회를 줄 뿐입니다.

## HTTP/2 트레일러

HTTP/2는 본문 뒤의 HEADERS 프레임(트레일러)을 지원합니다. 표준 소비자는 gRPC입니다
(트레일러의 `grpc-status`).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

일괄 설정:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // 모두 제거
$res->getTrailers();
```

HTTP/1.1에서는 값이 **조용히 무시**됩니다: chunked 인코딩에서의 트레일러 전송은 아직 구현되지
않았습니다 (Step 5b).

> 트레일러 이름은 소문자로 작성됩니다 (RFC 9113 §8.2.2). 대문자는 자동 변환됩니다.

## 참고

- [`HttpServerConfig::setBodyStreamingEnabled()`](/ko/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/ko/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/ko/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/ko/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/ko/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/ko/docs/reference/server/http-response.html#settrailer)
