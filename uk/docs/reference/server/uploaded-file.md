---
layout: docs
lang: uk
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /uk/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — PSR-7-сумісний клас для завантажених multipart-файлів. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Представлення одного завантаженого файлу з `multipart/form-data`. PSR-7-сумісний.

Отримується через
[`HttpRequest::getFile()`](/uk/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/uk/docs/reference/server/http-request.html#getfiles).

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

## Методи

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream-resource для читання файлу. Можна читати **частково завантажений** файл.

| | |
|---|---|
| return | `resource` або `null`, якщо недоступний |
| throws | `\RuntimeException`, якщо файл уже було переміщено `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Переміщує завантажений файл.

- Підтримує абсолютні та відносні шляхи.
- Автоматично створює parent-директорії за відсутності.
- Крос-FS: автоматичний fallback на `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException`, якщо вже переміщено або помилка запису |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Розмір файлу в байтах. `null`, якщо невідомий (наприклад, при streaming до отримання tail).

### getError

```php
public UploadedFile::getError(): int
```

Код помилки у форматі PHP `UPLOAD_ERR_*`.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Оригінальне ім'я від клієнта, **як прийшло** (без модифікацій). Ліміт 4 KB.

> **Не довіряйте**. Ім'я може містити будь-які байти (включно з path-separators). Перед використанням
> або саніруйте, або генеруйте ім'я на сервері.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME-тип від клієнта (взятий як є з браузерного Content-Type частини). Не верифікується сервером.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset із заголовка `Content-Type` частини (якщо вказаний).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` після повного завантаження і закриття тимчасового дескриптора.

### isValid

```php
public UploadedFile::isValid(): bool
```

Еквівалент `getError() === UPLOAD_ERR_OK`.

## Приклад

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

    // Перевіримо, що клієнт надіслав картинку (довіряємо лише в першому наближенні)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Ім'я генеруємо самі, не довіряючи клієнту
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

## Декілька файлів в одному полі

`HTML-форма`:

```html
<input type="file" name="photos[]" multiple>
```

Отримання:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` у цьому випадку поверне **перший** файл з масиву — для doc-першого-файлу достатньо;
для всіх — `getFiles()`.

## Див. також

- [`HttpRequest::getFile()`](/uk/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/uk/docs/reference/server/http-request.html#getfiles)
- [Multipart upload — приклад](/uk/docs/server/examples.html#multipart-upload-з-file-move)
