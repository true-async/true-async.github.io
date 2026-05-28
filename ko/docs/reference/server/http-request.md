---
layout: docs
lang: ko
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /ko/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — HTTP 요청의 읽기 전용 표현: 메서드, URI, 헤더, 본문, query, multipart, W3C Trace Context, 본문 스트리밍."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

핸들러의 첫 번째 매개변수로 전달되는 읽기 전용 객체. 서버가 생성하며 사용자가 구성하지 않습니다.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- 공통 ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- 헤더 ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- 본문 ---
    public function getBody(): string;
    public function hasBody(): bool;
    public function awaitBody(): static;
    public function readBody(int $maxLen = 65536): ?string;

    // --- multipart / form ---
    public function getPost(): array;
    public function getFiles(): array;
    public function getFile(string $name): ?UploadedFile;

    // --- W3C Trace Context ---
    public function getTraceParent(): ?string;
    public function getTraceState(): ?string;
    public function getTraceId(): ?string;
    public function getSpanId(): ?string;
    public function getTraceFlags(): ?int;
}
```

## 공통

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"` 등.

### getUri

```php
public HttpRequest::getUri(): string
```

요청의 전체 URI — 경로 + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

query string 없는 경로. 예: `/search?q=hello`에서 `/search`. HTTP/1.1, HTTP/2(`:path`
pseudo-header), HTTP/3에서 동일합니다. `getQuery()`와 lazy 파싱을 공유합니다 — URI는 첫 접근 시
path/query로 분리되어 request struct에 캐싱됩니다.

### getHttpVersion

```php
public HttpRequest::getHttpVersion(): string
```

`"1.1"`, `"2"`, `"3"`.

### isKeepAlive

```php
public HttpRequest::isKeepAlive(): bool
```

## Query

### getQuery

```php
public HttpRequest::getQuery(): array
```

모든 query 매개변수의 연관 배열 — `$_GET`과 동등. percent-decoding, `+`-as-space, PHP 배열 표기
(`foo[]`, `foo[bar]`)를 지원합니다. 파싱은 `php_default_treat_data(PARSE_STRING, ...)`에
위임됩니다 — `$_GET`을 채우는 동일한 함수.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

이름으로 하나의 매개변수를 가져오거나, 없으면 `$default`(기본 `null`).

## 헤더

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

대소문자 무시.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

단일 값, 대소문자 무시. 없으면 `null`.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

모든 값을 콤마로 결합. 없으면 빈 문자열.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

모든 헤더. 이름은 **소문자**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

`Content-Type` 값 또는 `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` 또는 `null` (없거나 유효하지 않음).

## 본문

### getBody

```php
public HttpRequest::getBody(): string
```

요청 본문. 본문이 없으면 빈 문자열.

> 스트리밍 본문 모드(`HttpServerConfig::setBodyStreamingEnabled(true)`)에서는 `getBody()`가
> 예외를 던집니다 — `readBody()`로 읽으세요.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

전체 본문을 기다립니다. Phase 6 Step 3+부터 핸들러는 본문 수신 전에 **parsed-headers 직후**
호출될 수 있습니다. `awaitBody()`는 message-complete까지 코루틴을 일시 중단합니다.

본문이 이미 버퍼에 완전히 있으면(현재 기본) suspend 없이 즉시 반환됩니다.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

본문의 pull 기반 스트림 (issue #26). 호출당 **하나**의 파서 공급 chunk를 반환합니다.

- H2 DATA 프레임 (≈ 16 KiB);
- llhttp `on_body` slice (H1의 read buffer — 8 KiB로 제한).

동작:

- 빈 큐 → 코루틴이 per-request trigger 이벤트에서 대기.
- EOF → `null` (멱등).
- 스트림 오류 (peer reset, `max_body_size` 초과) → `\Exception`.
- `$maxLen`은 향후 coalesce 최적화용으로 예약되어 있으며 현재 무시됩니다. 시그니처는 향후 마무리와
  바이너리 호환됩니다.

`HttpServerConfig::setBodyStreamingEnabled(true)`일 때만 **사용 가능**합니다.

[스트리밍](/ko/docs/server/streaming.html) 참고.

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

`multipart/form-data` 또는 `application/x-www-form-urlencoded`의 POST 데이터. PHP 스타일 배열
지원: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

업로드된 모든 파일. 같은 이름의 여러 파일: `['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

이름으로 단일 파일. `photos[]`에 대해서는 배열의 첫 번째. 없으면 `null`.

[`UploadedFile`](/ko/docs/reference/server/uploaded-file.html) 참고.

## W3C Trace Context

`HttpServerConfig::setTelemetryEnabled(true)` 필요.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

수신한 그대로의 raw `traceparent`. 없거나 malformed이거나 telemetry가 꺼져 있으면 `null`.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

raw `tracestate`. 없거나 telemetry가 꺼져 있으면 `null`.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

디코딩된 32자 lower-hex trace-id, 또는 `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

디코딩된 16자 lower-hex parent span-id, 또는 `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

디코딩된 8비트 flags 바이트 (예: `0x01` — sampled), 또는 `null`.

## 예제

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    error_log(sprintf(
        "[%s] %s %s (HTTP/%s, body=%s, traceid=%s)",
        $req->getMethod(),
        $req->getPath(),
        $req->getQuery() ? json_encode($req->getQuery()) : '-',
        $req->getHttpVersion(),
        $req->getContentLength() ?? 'n/a',
        $req->getTraceId() ?? '-'
    ));

    if ($req->getMethod() === 'POST' && $req->getContentType() === 'application/json') {
        $body = json_decode($req->getBody(), true);
        // ...
    }

    $res->json(['ok' => true]);
});
```

## 참고

- [`TrueAsync\HttpResponse`](/ko/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/ko/docs/reference/server/uploaded-file.html)
- [스트리밍](/ko/docs/server/streaming.html)
