---
layout: docs
lang: ko
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /ko/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — multipart 업로드 파일을 위한 PSR-7 호환 클래스. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

`multipart/form-data`의 단일 업로드 파일 표현. PSR-7 호환.

[`HttpRequest::getFile()`](/ko/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/ko/docs/reference/server/http-request.html#getfiles)로 얻습니다.

```php
namespace TrueAsync;

final class UploadedFile
{
    public function getStream(): mixed;
    public function moveTo(string $targetPath, int $mode = 0644): void;
    public function getSize(): ?int;
    public function getError(): int;
    public function getClientFilename(): ?string;
    public function getClientMediaType(): ?string;
    public function getClientCharset(): ?string;
    public function isReady(): bool;
    public function isValid(): bool;
}
```

## 메서드

### getStream

```php
public UploadedFile::getStream(): mixed
```

파일 읽기용 stream resource. **부분적으로 업로드된** 파일도 읽을 수 있습니다.

| | |
|---|---|
| return | `resource` 또는 사용할 수 없으면 `null` |
| throws | 파일이 이미 `moveTo()`로 이동된 경우 `\RuntimeException` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

업로드 파일을 이동합니다.

- 절대 경로와 상대 경로 모두 지원.
- 부모 디렉터리가 없으면 자동 생성.
- cross-FS: `copy() + unlink()`로 자동 fallback.

| | |
|---|---|
| throws | 이미 이동되었거나 쓰기 오류인 경우 `\RuntimeException` |

### getSize

```php
public UploadedFile::getSize(): ?int
```

바이트 단위 파일 크기. tail 수신 전 스트리밍 등 알 수 없는 경우 `null`.

### getError

```php
public UploadedFile::getError(): int
```

PHP `UPLOAD_ERR_*` 형식의 오류 코드.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

클라이언트가 보낸 원본 이름, **수정 없이 그대로**. 4 KB 한도.

> **신뢰하지 마세요**. 이름에는 임의의 바이트(path-separator 포함)가 들어있을 수 있습니다.
> 사용 전 sanitize하거나 서버에서 이름을 생성하세요.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

클라이언트가 제공한 MIME 타입 (브라우저의 part Content-Type을 그대로 가져옴). 서버에서 검증되지
않습니다.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

part의 `Content-Type` 헤더에서 가져온 charset (지정된 경우).

### isReady

```php
public UploadedFile::isReady(): bool
```

전체 업로드 및 임시 디스크립터 닫힘 이후 `true`.

### isValid

```php
public UploadedFile::isValid(): bool
```

`getError() === UPLOAD_ERR_OK`와 동등.

## 예제

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getMethod() !== 'POST') {
        $res->setStatusCode(405); return;
    }

    $avatar = $req->getFile('avatar');
    if ($avatar === null) {
        $res->setStatusCode(400)->json(['error' => 'no avatar field']); return;
    }

    if (!$avatar->isValid()) {
        $res->setStatusCode(400)->json([
            'error' => 'upload error',
            'code'  => $avatar->getError(),
        ]);
        return;
    }

    if ($avatar->getSize() > 5 * 1024 * 1024) {
        $res->setStatusCode(413)->json(['error' => 'too big']); return;
    }

    // 클라이언트가 이미지를 보냈는지 확인 (1차적으로만 신뢰)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // 이름은 서버에서 생성, 클라이언트를 신뢰하지 않음
    $name = bin2hex(random_bytes(16)) . '.bin';
    $avatar->moveTo("/var/storage/avatars/$name", 0644);

    $res->json([
        'saved'         => $name,
        'original_name' => $avatar->getClientFilename(),
        'declared_mime' => $declared,
        'size'          => $avatar->getSize(),
    ]);
});
```

## 한 필드의 여러 파일

HTML 폼:

```html
<input type="file" name="photos[]" multiple>
```

수신:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

이 경우 `getFile('photos')`는 배열의 **첫 번째** 파일을 반환합니다 — 첫 번째 파일만 필요할 때
충분합니다. 모두 필요하면 `getFiles()`.

## 참고

- [`HttpRequest::getFile()`](/ko/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/ko/docs/reference/server/http-request.html#getfiles)
- [Multipart 업로드 예제](/ko/docs/server/examples.html#file-move를-사용하는-multipart-업로드)
