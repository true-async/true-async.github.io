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
        $res
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/event-stream')
            ->setHeader('Cache-Control', 'no-store')
            ->setNoCompression();

        foreach (loadEvents() as $event) {
            $res->send("data: " . json_encode($event) . "\n\n");
        }
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
- [스트리밍](/ko/docs/server/streaming.html)
- [압축](/ko/docs/server/compression.html)
