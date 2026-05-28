---
layout: docs
lang: ko
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /ko/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — HttpResponse::sendFile() 설정 값 객체. Disposition, downloadName, ETag, Range, precompressed sidecar, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

[`HttpResponse::sendFile()`](/ko/docs/reference/server/http-response.html#sendfile)의 설정 값 객체.
불변(`final readonly class`)이며 생성자의 named-args로 생성합니다.

```php
namespace TrueAsync;

final readonly class SendFileOptions
{
    public function __construct(
        public ?string             $contentType     = null,
        public SendFileDisposition $disposition     = SendFileDisposition::INLINE,
        public ?string             $downloadName    = null,
        public ?string             $cacheControl    = null,
        public bool                $etag            = true,
        public bool                $lastModified    = true,
        public bool                $acceptRanges    = true,
        public bool                $precompressed   = true,
        public bool                $conditional     = true,
        public bool                $deleteAfterSend = false,
        public ?int                $status          = null,
    ) {}
}
```

## 필드

| 필드 | 타입 | 기본 | 동작 |
|------|-----|--------|------------|
| `contentType` | `?string` | `null` | MIME 재정의. `null`은 확장자에서 자동 결정. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE`은 브라우저에 표시. `ATTACHMENT`는 다운로드. `Content-Disposition`에 영향. |
| `downloadName` | `?string` | `null` | `Content-Disposition: attachment; filename=...`의 파일명. `ATTACHMENT`와 함께 의미 있음. |
| `cacheControl` | `?string` | `null` | `Cache-Control`에 그대로. `null`은 헤더 없음. |
| `etag` | `bool` | `true` | `(mtime_ns, size, ino)`에서 산출된 weak `ETag` emit. |
| `lastModified` | `bool` | `true` | `Last-Modified` (IMF-fixdate) emit. |
| `acceptRanges` | `bool` | `true` | `Range:` 지원 (HTTP/1.1 partial content). |
| `precompressed` | `bool` | `true` | 호환 `Accept-Encoding` 시 sidecar (`*.br`, `*.gz`, `*.zst`) 검색. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | 전송 성공 후 `unlink($path)`. temp 파일에서의 one-shot 다운로드에 유용. |
| `status` | `?int` | `null` | HTTP 상태 재정의. 예: 기본이 304인 상태에서도 staged 응답에 200을 강제. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## 예제

### 인라인 PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### 사용자에게 표시할 이름을 가진 다운로드

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### One-shot temp 파일

```php
$tmp = '/tmp/export-' . bin2hex(random_bytes(8)) . '.csv';
generateExport($tmp);

$res->sendFile($tmp, new SendFileOptions(
    disposition:     SendFileDisposition::ATTACHMENT,
    downloadName:    'export.csv',
    contentType:     'text/csv; charset=utf-8',
    deleteAfterSend: true,
));
```

### conditional GET 없이 (항상 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### precompressed sidecar 없이 (엔진이 즉석에서 압축)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## 참고

- [`HttpResponse::sendFile()`](/ko/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/ko/docs/reference/server/static-handler.html)
- [정적 파일과 sendFile](/ko/docs/server/static-files.html)
