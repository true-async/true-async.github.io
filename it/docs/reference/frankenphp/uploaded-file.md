---
layout: docs
lang: it
path_key: "/docs/reference/frankenphp/uploaded-file.html"
nav_active: docs
permalink: /it/docs/reference/frankenphp/uploaded-file.html
page_title: "FrankenPHP\\UploadedFile"
description: "FrankenPHP\\UploadedFile class — access uploaded file metadata (name, type, size) and move files to a permanent location."
---

# FrankenPHP\UploadedFile

(True Async 0.6+)

`UploadedFile` objects are returned by [`Request::getUploadedFiles()`](/it/docs/reference/frankenphp/request.html#getuploadedfiles).
Each object represents one uploaded file and provides access to its metadata and a method to move it
to a permanent location.

Multiple files uploaded under the same field name are returned as an array of `UploadedFile` objects.

## Class Synopsis

```php
namespace FrankenPHP;

class UploadedFile
{
    public function getName(): string;
    public function getType(): string;
    public function getSize(): int;
    public function getTmpName(): string;
    public function getError(): int;
    public function moveTo(string $path): bool;
}
```

## Methods

### getName

```php
public UploadedFile::getName(): string
```

Returns the original filename as sent by the client.

> **Note:** never trust the original filename for storage. Always sanitize or generate
> a safe name before saving.

### getType

```php
public UploadedFile::getType(): string
```

Returns the MIME type reported by the client (e.g. `image/png`).

### getSize

```php
public UploadedFile::getSize(): int
```

Returns the file size in bytes.

### getTmpName

```php
public UploadedFile::getTmpName(): string
```

Returns the path to the temporary file on disk.

### getError

```php
public UploadedFile::getError(): int
```

Returns the upload error code. `UPLOAD_ERR_OK` (0) means success.
See [PHP upload error constants](https://www.php.net/manual/en/features.file-upload.errors.php).

### moveTo

```php
public UploadedFile::moveTo(string $path): bool
```

Moves the uploaded file to the given destination path. Returns `true` on success.

## Examples

### Example #1 Handling a single file upload

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();

    if (isset($files['avatar'])) {
        $file = $files['avatar'];

        if ($file->getError() === UPLOAD_ERR_OK) {
            $safeName = bin2hex(random_bytes(16)) . '.png';
            $file->moveTo('/uploads/' . $safeName);

            $response->setStatus(200);
            $response->write("Uploaded: {$file->getName()} ({$file->getSize()} bytes)");
        } else {
            $response->setStatus(400);
            $response->write("Upload error code: {$file->getError()}");
        }
    } else {
        $response->setStatus(400);
        $response->write('No file uploaded');
    }

    $response->end();
});
```

### Example #2 Handling multiple files

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();
    $saved = [];

    // Multiple files uploaded as photos[]
    $photos = $files['photos'] ?? [];

    if (!is_array($photos)) {
        $photos = [$photos];
    }

    foreach ($photos as $file) {
        if ($file->getError() === UPLOAD_ERR_OK) {
            $dest = '/uploads/' . bin2hex(random_bytes(8)) . '_' . $file->getName();
            $file->moveTo($dest);
            $saved[] = $file->getName();
        }
    }

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['saved' => $saved]));
    $response->end();
});
```

## See Also

- [FrankenPHP\Request](/it/docs/reference/frankenphp/request.html) -- Reading request data
- [FrankenPHP\Response](/it/docs/reference/frankenphp/response.html) -- Building and sending responses
- [FrankenPHP Integration Guide](/it/docs/frankenphp.html) -- Installation, configuration, and deployment
