---
layout: docs
lang: ko
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /ko/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — PHP 핸들러 없는 prefix-mount 정적 파일 제공. Precompressed sidecar, ETag, Range, dotfile/symlink 정책, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

내장 정적 파일 핸들러 (issue #13). 인스턴스 1개 = prefix-mount 1개.
[`HttpServer::addStaticHandler()`](/ko/docs/reference/server/http-server.html#addstatichandler)로
서버에 attach됩니다.

완전히 C에서 동작: 요청은 코루틴을 spawn하지 않고 PHP VM에 진입하지 않으며, 파일은 libuv 비동기
fs 연산을 통해 직접 response stream으로 전송됩니다.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // 인덱스 / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // precompressed sidecar
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // 보안
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // 캐시 / 헤더
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // 디렉터리 listing
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // introspection
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## 생성자

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| 매개변수 | 요구 사항 |
|----------|------------|
| `$urlPrefix` | URL 접두사. `/`로 시작하고 끝나야 합니다. 예: `"/static/"`. |
| `$rootDirectory` | 디스크의 디렉터리 절대 경로. attach 시점에 canonicalize됩니다. |

## 인덱스 / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

directory URL 요청에 반환할 파일 이름. 기본 `["index.html"]`. 빈 목록은 인덱스 lookup을
비활성화합니다.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

`setIndexFiles()`와 동등.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

요청 경로가 root 내의 일반 파일로 해석되지 않을 때의 동작:

| 값 | 동작 |
|----------|-----------|
| `StaticOnMissing::NOT_FOUND` (기본) | C에서 404, 요청이 PHP VM에 도달하지 않음 |
| `StaticOnMissing::NEXT` | 제어가 dispatcher로 반환되고 일반 핸들러 코루틴이 spawn됨 — 요청이 [`addHttpHandler()`](/ko/docs/reference/server/http-server.html#addhttphandler)로 감 |

## Precompressed sidecar

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

클라이언트가 `Accept-Encoding`으로 허용하면 precompressed sidecar(`main.css.br`, `main.css.gz`,
`main.css.zst`) 제공을 활성화합니다. 인수는 content-coding 이름: `"br"`, `"gzip"`, `"zstd"`.
알 수 없는 이름은 setter에서 `InvalidArgumentException`.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## 보안

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" — `.`으로 시작하는 모든 path segment (`..` 포함; `..`은 정책과 무관하게 traversal guard가
항상 거부).

| | 동작 |
|---|---|
| `StaticDotfiles::DENY` (기본) | dotfile 컴포넌트가 있는 모든 경로에 404 |
| `StaticDotfiles::ALLOW` | dotfile이 일반 파일처럼 제공됨 |
| `StaticDotfiles::IGNORE` | 파일이 없는 것처럼 동작 (`StaticOnMissing`에 따라 passthrough) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | 동작 |
|---|---|
| `StaticSymlinks::REJECT` (기본) | 경로 상의 모든 symlink에 404. `O_NOFOLLOW` + per-segment `lstat` — symlink는 절대 traverse되지 않음 |
| `StaticSymlinks::FOLLOW` | symlink를 따라감; `realpath()` 이후 target은 root 안에 있어야 함 |
| `StaticSymlinks::OWNER_MATCH` | symlink와 target이 같은 uid를 가질 때만 따라감 |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Glob 패턴: 일치 경로는 존재 여부와 상관없이 404를 반환합니다. 비교는 **root 기준**, 구분자 `/`.

## 캐시 / 헤더

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

weak ETag toggle (기본 `true`). 활성화 시 각 200 응답이 `(mtime_ns, size, ino)`에서 산출된
`ETag: W/"…"`를 포함합니다. `If-None-Match` / `If-Modified-Since`는 304를 반환합니다.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

리터럴 `Cache-Control`. 빈 문자열은 emission을 억제합니다.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx 스타일 open-file cache: 마지막 N개 요청의 resolved path, fstat 메타데이터, MIME, ETag,
Last-Modified를 저장합니다. `ttlSeconds` 안의 반복 요청은 캐시 히트하고 realpath/stat/MIME-walk를
건너뜁니다.

기본 비활성. cold dentry, 큰 docroot, 네트워크 FS에서 이득이 있습니다. 로컬 디스크 warm dentry에서는
syscall이 이미 µs 단위라 HashTable lookup 오버헤드가 이득을 잡아먹습니다.

`$maxEntries == 0`은 비활성화.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

`setOpenFileCache(0)`의 syntactic sugar.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

attach 시점에 한 번 평가되는 고정 헤더. 모든 200과 304에 emit됩니다 (RFC 9110 §15.4.5의
`Content-*` 헤더 제외).

## 디렉터리 listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

index가 없는 디렉터리 요청에 대한 HTML listing toggle. 기본 `false`.

> PR #6용으로 예약 — 현재 no-op이며 setter에서 효과 없이 받아들여집니다.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

지정된 확장자에 대해 `Content-Type`을 재정의. 확장자는 선행 점 없이 소문자.

## Introspection

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

`addStaticHandler()`로 서버에 attach된 후 `true`. locked handler는 모든 setter를 runtime 예외로
거부합니다.

## Enum

별도 페이지 참고:

- [`StaticOnMissing`](/ko/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/ko/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/ko/docs/reference/server/static-symlinks.html)

(셋 모두 `TrueAsync` 네임스페이스의 `enum: int`.)

## 예제

```php
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;
use TrueAsync\StaticDotfiles;

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html', 'index.htm')
    ->enablePrecompressed('br', 'gzip')
    ->setOnMissing(StaticOnMissing::NEXT)
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true)
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60)
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->hide('*.bak', '*.tmp', 'private/**');

$server->addStaticHandler($static);
```

## 참고

- [정적 파일과 sendFile](/ko/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/ko/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/ko/docs/reference/server/http-response.html#sendfile)
