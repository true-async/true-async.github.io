---
layout: docs
lang: ko
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /ko/docs/server/static-files.html
page_title: "TrueAsync Server: 정적 파일과 sendFile"
description: "StaticHandler: PHP 핸들러 없이 내장 정적 파일 제공. sendFile(): 핸들러에서 파일 전송. precompressed sidecar, ETag, Range, 보안 정책."
---

# 정적 파일과 sendFile

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server에는 파일 전달을 위한 두 가지 독립적 메커니즘이 있습니다.

1. **`StaticHandler`** — 별도의 prefix 마운트로 **완전히 C에서** 처리되며 코루틴을 spawn하거나
   PHP VM에 진입하지 않습니다.
2. **`HttpResponse::sendFile()`** — 핸들러 주도 전달. PHP 코드가 결정을 내리고(auth, ACL, 이름
   생성), 서버가 디스크에서 가져와 전송합니다.

둘 다 엔진 내부의 동일한 FSM을 사용합니다 (MIME, ETag, IMF-date, Range, conditional GET,
precompressed sidecar).

## StaticHandler

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())->addListener('0.0.0.0', 8080)
);

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html')
    ->enablePrecompressed('br', 'gzip')
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true);

$server->addStaticHandler($static);

$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->setBody('dynamic route');
});

$server->start();
```

`/static/...`에 대한 요청은 `StaticHandler`가 처리합니다 (PHP 핸들러가 호출되지 않음).
그 외 모든 것은 일반적인 `addHttpHandler`로 갑니다.

여러 마운트는 **등록 순서대로** 매칭됩니다. attach 후 `StaticHandler`는 잠기며, 이후의
setter는 `HttpServerRuntimeException`을 던집니다.

### 인덱스와 fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // 디렉터리 URL에 무엇을 반환할지
    ->disableIndex()                              // 또는 index lookup 자체를 비활성화
    ->setOnMissing(StaticOnMissing::NEXT);        // → PHP 핸들러로 넘김
```

**`StaticOnMissing`**은 root 안에서 파일을 찾지 못했을 때의 동작을 결정합니다.

| 값 | 동작 |
|----------|-----------|
| `NOT_FOUND` (기본) | C에서 404, 요청이 PHP VM에 도달하지 않음 |
| `NEXT` | 제어가 dispatcher로 넘어가고 일반 핸들러 코루틴이 spawn됨 |

> trailing slash 없는 디렉터리 URL에 대한 요청에서 모든 index 파일이 404이면 404가 반환됩니다.
> nginx/Apache가 하는 301 redirect는 이 핸들러가 **발행하지 않습니다**. 배포가 디렉터리 경로의
> catch-all에 의존한다면 index lookup을 끄세요: `setIndexFiles([])` / `disableIndex()`.

### Precompressed sidecar

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

클라이언트가 `Accept-Encoding: br, gzip`을 보내면 핸들러는 `main.css` 옆의 `main.css.br`을
찾아 인코딩 CPU 비용 없이 sidecar를 그대로 반환합니다. 지원되는 이름: `"br"`, `"gzip"`, `"zstd"`.
알 수 없는 이름은 setter에서 `InvalidArgumentException`을 던집니다.

### 보안 정책

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**:

| | 동작 |
|---|---|
| `DENY` (기본) | `.`로 시작하는 segment(`..` 포함)를 포함하는 모든 경로에 대해 404 |
| `ALLOW` | dotfile이 일반 파일처럼 제공됨 |
| `IGNORE` | 파일이 없는 것처럼 동작 (`StaticOnMissing`에 따라 passthrough) |

**`StaticSymlinks`**:

| | 동작 |
|---|---|
| `REJECT` (기본) | 경로 상의 모든 symlink에 대해 404. `O_NOFOLLOW` + per-segment `lstat`, symlink는 절대 traverse되지 않음 |
| `FOLLOW` | symlink를 따라감; `realpath()` 이후 target은 root 안에 있어야 함 |
| `OWNER_MATCH` | symlink와 target이 같은 uid를 가질 때만 따라감 |

`hide($glob, ...)`는 파일 존재 여부와 상관없이 404를 반환할 glob 패턴을 정의합니다. 비교는
**root 기준**, 구분자 `/`로 수행됩니다.

### 캐시 / 헤더

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" from (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache**(nginx 스타일): 마지막 N개 요청의 resolved path, fstat 메타데이터, MIME, ETag,
Last-Modified를 보관합니다. `ttlSeconds` 안에서 반복 요청은 캐시 히트하고 realpath/stat/MIME-walk을
건너뜁니다.

기본 비활성. cold dentry, 큰 docroot, 네트워크 FS에서 이득이 있습니다. 로컬 디스크의 warm dentry에서는
syscall이 이미 µs 단위라 HashTable 조회 오버헤드가 이득을 잡아먹습니다.

### MIME override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

확장자는 선행 점 없이 소문자로.

### 성능

0.4.0부터 엔진에 다음이 추가되었습니다.

- **인라인 `open(2)`/`fstat(2)`** (issue #13): libuv 스레드 풀을 통한 futex 왕복 없음.
  성과: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-file fast path** (≤ 64 KiB): 파일을 `zend_string`으로 slurp하고
  단일 `writev(headers + body)`로 전송. 성과: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- 64 KiB 초과 파일은 sendfile을 사용합니다.

## 핸들러의 sendFile

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, $res) {
    $userId = (int) $req->getQueryParam('id');
    if (!isAuthorized($userId)) {
        $res->setStatusCode(403); return;
    }

    $res->sendFile('/var/storage/reports/2026-Q1.pdf', new SendFileOptions(
        contentType:   'application/pdf',
        disposition:   SendFileDisposition::ATTACHMENT,
        downloadName:  'Q1-report.pdf',
        cacheControl:  'private, no-store',
        acceptRanges:  true,
        conditional:   true,
        precompressed: false,
    ));
});
```

`sendFile()`은 path + options를 response에 **기록**하고 **즉시 반환**됩니다. 실제 파일 전송은
`StaticHandler`와 동일한 FSM을 통해 dispose 단계에서 일어납니다. sendFile에는 compression
미들웨어가 우회됩니다 (자체 전달 파이프라인).

`sendFile()` 이후 response는 **봉인**됩니다: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end`와 반복 `sendFile()`은
`HttpServerRuntimeException`을 던집니다.

이 경로는 **신뢰됨**으로 간주됩니다: 핸들러가 직접 접근을 결정했습니다. open/fstat 오류
(`ENOENT`, `EACCES`, oversize, non-regular)는 헤더가 아직 전송되지 않았으므로 500을 반환합니다.

### SendFileOptions

`final readonly class`이며 생성자에서 named-args를 받습니다.

| 필드 | 타입 | 기본 | 동작 |
|------|-----|--------|------------|
| `contentType` | `?string` | `null` | MIME 재정의; `null`은 확장자에서 자동 |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` 또는 `ATTACHMENT` |
| `downloadName` | `?string` | `null` | `Content-Disposition: attachment; filename=...`의 파일명 |
| `cacheControl` | `?string` | `null` | `Cache-Control`에 그대로 |
| `etag` | `bool` | `true` | weak ETag 발행 |
| `lastModified` | `bool` | `true` | `Last-Modified` 발행 |
| `acceptRanges` | `bool` | `true` | `Range:` 지원 |
| `precompressed` | `bool` | `true` | `.br`/`.gz`/`.zst` sidecar 검색 |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | 전송 성공 후 unlink (one-shot 다운로드용) |
| `status` | `?int` | `null` | HTTP 상태 재정의 (예: CDN-respond 200) |

> `sendFile()`의 HTTP/3 경로는 아직 작업 중입니다. H3에서 dispose 훅이 500을 반환합니다.

## 참고

- [`TrueAsync\StaticHandler`](/ko/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/ko/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/ko/docs/reference/server/http-response.html#sendfile)
- [압축](/ko/docs/server/compression.html)
