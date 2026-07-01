---
layout: docs
lang: ko
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /ko/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — 상태, 헤더, 본문, send()/sendable() 스트림, HTTP/2 트레일러, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

fluent 인터페이스의 응답 객체. 핸들러의 두 번째 매개변수로 전달됩니다. 서버가 생성하며 사용자가
구성하지 않습니다.

```php
namespace TrueAsync;

final class HttpResponse
{
    // 상태
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // 헤더
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // 트레일러 (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // 프로토콜 introspection
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // 본문
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helper
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // 전송 / 상태
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;

    // Server-Sent Events (text/event-stream)
    public function sseStart(): static;
    public function sseEvent(?string $data = null, ?string $event = null, ?string $id = null, ?int $retry = null): static;
    public function sseComment(string $text = ""): static;
    public function sseRetry(int $milliseconds): static;

    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## 상태

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

HTTP 코드 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"` 등.

## 헤더

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

이전 값을 교체하며 헤더를 설정합니다.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

기존 값에 추가 (예: `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

handler가 설정한 값을 대소문자 무시로 읽기.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

모든 헤더 제거.

## 트레일러 (HTTP/2)

본문 뒤에 전송되는 HEADERS 프레임. 표준 소비자는 gRPC(`grpc-status`).
**HTTP/1.1에서는 값이 조용히 무시됩니다** — chunked 인코딩의 trailer 전송은 Step 5b의 범위 밖.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

이름은 소문자 (RFC 9113 §8.2.2); 대문자는 자동 변환.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

일괄 설정. 기존 trailer는 유지됩니다 — clean slate가 필요하면 먼저 `resetTrailers()`를
호출하세요.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## 프로토콜

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // 항상 "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## 본문

### write

```php
public HttpResponse::write(string $data): static
```

내부 body 버퍼에 append. 실제 전송은 `end()` 또는 handler 반환 시 자동으로.

### send

```php
public HttpResponse::send(string $chunk): static
```

chunk를 클라이언트로 전송 (스트리밍).

- **첫 번째** `send()`가 상태 + 헤더를 커밋합니다 — 이후 변경 불가.
- 후속 호출은 DATA 프레임(HTTP/2) 또는 chunked 세그먼트(HTTP/1)를 append합니다.
- backpressure(per-stream staging buffer 가득) **에서만** 핸들러 코루틴을 블로킹합니다.
  기본 backpressure 임계값: `setStreamWriteBufferBytes()` — 256 KiB.
- 일반적인 상황에서는 즉시 반환됩니다.

### sendable

```php
public HttpResponse::sendable(): bool
```

권고적 비블로킹 검사:

- `true` — `send()`가 코루틴 suspend 없이 chunk를 받음.
- `false` — `send()`가 backpressure로 블로킹되거나, 응답이 이미 `sendFile()`로 봉인/닫혀 있거나,
  스트리밍 가능 응답 유형이 아님.

`send()`는 **항상** 안전하게 호출할 수 있습니다 — `sendable()`은 단지 핸들러에 느린 peer를
기다리는 대신 다른 일을 할 기회를 줄 뿐입니다.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

이 응답에 대한 압축 금지 — Accept-Encoding, MIME 화이트리스트, 크기 임계값을 무시합니다.
적용 대상: BREACH에 민감한 엔드포인트(비밀 + 반사된 사용자 입력), 이미 `Content-Encoding`이
설정된 payload, 서버가 감싸지 말아야 할 본문. 멱등.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

현재 버퍼 내용 get/set.

## Helper

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

`php_json_encode_ex`를 통한 JSON 직렬화 (`json_encode()`와 같은 경로):

- `array` / `object` / scalar `$data` → encode됨.
- `string` `$data` → **그대로** 전송됨 (캐시된 JSON, 사전 빌드된 바이트). 재인코딩 생략.

`Content-Type: application/json`은 핸들러가 직접 설정하지 않은 경우 **에만** 적용됩니다 —
다른 media-type을 원하면 `setHeader('Content-Type', 'application/problem+json')->json($payload)`
체인을 사용하세요.

`$flags`는 `JSON_*` 비트마스크. `0`은
[`HttpServerConfig::setJsonEncodeFlags()`](/ko/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)의
서버 기본값 (기본 `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`).

`JSON_THROW_ON_ERROR`는 조용히 제거됩니다: encode 오류는 `500` JSON 오류를 반환하며 예외는
전파되지 않습니다. 핸들러는 `json()`을 try/catch로 감싸지 않아야 합니다.

### html

```php
public HttpResponse::html(string $html): static
```

`Content-Type: text/html`을 설정합니다.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## 전송

### end

```php
public HttpResponse::end(?string $data = null): void
```

응답을 완료하고 클라이언트에 전송. `end()` 후에는 더 이상 쓸 수 없습니다.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

핸들러 주도 파일 전달. path + options를 response에 기록하고 **즉시 반환**됩니다 — 실제 전송은
`StaticHandler`와 같은 FSM(MIME, ETag, IMF-date, Range, conditional GET, precompressed sidecar)을
통해 dispose 단계에서 일어납니다.

**`sendFile()` 이후 response는 봉인됨**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / 반복 `sendFile()`은
`HttpServerRuntimeException`을 던집니다.

경로는 **신뢰됨** (핸들러가 접근 결정을 내림). open/fstat 오류(`ENOENT`, `EACCES`, oversize,
non-regular)는 헤더가 아직 전송되지 않았으므로 500을 반환합니다.

sendFile 본문에는 압축 미들웨어가 우회됩니다 (자체 전달 파이프라인).

> `sendFile()`의 HTTP/3 경로는 작업 중입니다. H3 dispose 훅은 현재 500으로 거부합니다.

[`SendFileOptions`](/ko/docs/reference/server/send-file-options.html) 참고.

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). 예제가 있는 가이드: [SSE](/ko/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

응답을 SSE 모드로 전환하고 헤더를 고정합니다: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, 그리고 응답을
압축 불가로 표시합니다. 응답은 첫 `send()`와 같은 방식으로 스트리밍 모드에 들어갑니다:
상태와 헤더가 커밋되어 더 이상 바뀔 수 없지만, 이벤트 payload 자체는 아직 와이어에 나가지
않습니다.

호출은 선택 사항입니다: 첫 `sseEvent()`/`sseComment()`가 스트림을 스스로 시작합니다.
`sseStart()` 단독으로는 상태 줄과 헤더를 플러시하지 **않습니다**: 커밋은 지연되어 첫
`sseEvent()`/`sseComment()`/`sseRetry()`에서 이루어집니다(하나도 호출되지 않으면 응답이
끝날 때 빈 `200 text/event-stream`이 플러시됩니다). 스트림을 즉시 열고 싶다면, 예를 들어
실제 이벤트가 준비되기 전에 브라우저의 `onopen`을 먼저 해제하려는 경우, 초기 `sseComment()`를
보내세요.

핸들러가 이미 `text/event-stream`이 아닌 다른 `Content-Type`을 설정한 경우
`HttpServerInvalidArgumentException`을 던지고, 응답이 이미 스트리밍 중이거나 닫혔거나
`sendFile()`로 사용 중인 경우 `HttpServerRuntimeException`을 던집니다.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

SSE 이벤트 하나를 포맷하여 전송하며, 필요하면 스트림을 시작합니다. 여러 줄로 된 `$data`는
`\n`/`\r\n`/`\r` 기준으로 나뉘어 여러 개의 `data:` 필드로 전송됩니다(WHATWG §9.2). `$event`,
`$id`, `$retry`는 `null`이 아닐 때만 포함됩니다. 레코드는 빈 줄로 끝나서 브라우저가 바로
이벤트를 디스패치합니다.

`$event`와 `$id`는 `\r`/`\n`을 포함해서는 안 되며(그렇지 않으면 파서가 이를 필드/레코드
구분자로 읽습니다), `$id`는 NUL을 포함해서는 안 됩니다: 위반 시
`HttpServerInvalidArgumentException`을 던집니다. `$retry`는 음수가 아니어야 합니다.

`$data === ""`도 유효한 값입니다. 빈 `MessageEvent`를 디스패치합니다. 네 인수 모두 `null`이면
아무 동작도 하지 않습니다. `EventSource` 파서는 `data`도 `retry`도 없는 이벤트를 건너뜁니다.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

주석 줄(`:`로 시작하는 레코드)을 전송합니다. 브라우저는 주석을 무시하지만, 중간 프록시의
idle 타임아웃(nginx의 `proxy_read_timeout`, 기본 60초)을 통과해 연결을 살아 있게 유지합니다.
표준 payload는 빈 문자열입니다(와이어에서는 `:\n\n`). `$text`는 `\r`/`\n`을 포함해서는
안 됩니다. 아직 실행 중이 아니면 스트림을 시작합니다.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

스트림이 끊긴 후 몇 밀리초 뒤에 재연결할지 브라우저에 알리는 순수 `retry:` 지시자를
전송합니다. payload 없이 `sseEvent(retry: $milliseconds)`를 호출하는 것의 syntactic
sugar입니다. 아직 실행 중이 아니면 스트림을 시작합니다.

## 상태

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## 예제

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        foreach (loadEvents() as $event) {
            $res->sseEvent(json_encode($event));
        }
        $res->end();
        return;
    }

    // sendFile
    if ($req->getPath() === '/report.pdf') {
        $res->sendFile('/var/reports/q1.pdf', new SendFileOptions(
            disposition:  SendFileDisposition::ATTACHMENT,
            downloadName: 'Q1-Report.pdf',
        ));
        return;
    }

    // JSON
    $res->json(['ok' => true]);
});
```

## 참고

- [`TrueAsync\HttpRequest`](/ko/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/ko/docs/reference/server/send-file-options.html)
- [SSE](/ko/docs/server/sse.html)
- [스트리밍](/ko/docs/server/streaming.html)
- [압축](/ko/docs/server/compression.html)
