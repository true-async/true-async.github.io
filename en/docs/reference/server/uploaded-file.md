---
layout: docs
lang: en
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /en/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — PSR-7-compatible class for uploaded multipart files. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Representation of a single uploaded file from `multipart/form-data`. PSR-7 compatible.

Obtained through
[`HttpRequest::getFile()`](/en/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/en/docs/reference/server/http-request.html#getfiles).

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

## Methods

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream resource for reading the file. You can read a **partially uploaded** file.

| | |
|---|---|
| returns | `resource` or `null` if unavailable |
| throws | `\RuntimeException` if the file was already moved via `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Moves the uploaded file.

- Supports absolute and relative paths.
- Creates parent directories automatically if they do not exist.
- Cross-filesystem: automatic fallback to `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException` if already moved or on write error |

### getSize

```php
public UploadedFile::getSize(): ?int
```

File size in bytes. `null` if unknown (for example, while streaming before the tail arrives).

### getError

```php
public UploadedFile::getError(): int
```

Error code in PHP `UPLOAD_ERR_*` format.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Original name from the client, **as received** (with no modifications). 4 KB limit.

> **Do not trust it.** The name may contain any bytes (including path separators). Sanitise it
> before use or generate the name server-side.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME type from the client (taken verbatim from the browser's part Content-Type). Not verified by
the server.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset from the part's `Content-Type` header (if specified).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` after the file has fully uploaded and the temporary descriptor has been closed.

### isValid

```php
public UploadedFile::isValid(): bool
```

Equivalent to `getError() === UPLOAD_ERR_OK`.

## Example

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

    // Verify that the client sent an image (only a first-order trust signal)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Generate the name server-side; don't trust the client
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

## Multiple files in one field

HTML form:

```html
<input type="file" name="photos[]" multiple>
```

Reading:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` in this case returns the **first** file in the array — enough for a doc-first
file; use `getFiles()` for all.

## See also

- [`HttpRequest::getFile()`](/en/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/en/docs/reference/server/http-request.html#getfiles)
- [Multipart upload example](/en/docs/server/examples.html#multipart-upload-with-file-move)
