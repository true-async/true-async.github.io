---
layout: docs
lang: ru
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /ru/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — PSR-7-совместимый класс для загруженных multipart-файлов. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Представление одного загруженного файла из `multipart/form-data`. PSR-7-совместимый.

Получается через
[`HttpRequest::getFile()`](/ru/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/ru/docs/reference/server/http-request.html#getfiles).

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

## Методы

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream-resource для чтения файла. Можно читать **частично загруженный** файл.

| | |
|---|---|
| return | `resource` или `null` если недоступен |
| throws | `\RuntimeException` если файл уже был перемещён `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Перемещает загруженный файл.

- Поддерживает абсолютные и относительные пути.
- Автоматически создаёт parent-директории при отсутствии.
- Кросс-FS: автоматический fallback на `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException` если уже перемещён или ошибка записи |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Размер файла в байтах. `null` если неизвестен (e.g. при streaming до получения tail).

### getError

```php
public UploadedFile::getError(): int
```

Код ошибки в формате PHP `UPLOAD_ERR_*`.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Оригинальное имя от клиента, **как пришло** (без модификаций). Лимит 4 KB.

> **Не доверяйте**. Имя может содержать любые байты (включая path-separators). Перед использованием
> либо санируйте, либо генерируйте имя на сервере.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME-тип от клиента (взят как есть из браузерного Content-Type части). Не верифицируется сервером.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset из заголовка `Content-Type` части (если указан).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` после полной загрузки и закрытия временного дескриптора.

### isValid

```php
public UploadedFile::isValid(): bool
```

Эквивалент `getError() === UPLOAD_ERR_OK`.

## Пример

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

    // Проверим, что клиент прислал картинку (доверяем только в первом приближении)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Имя генерим сами, не доверяя клиенту
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

## Multiple files в одном поле

`HTML-форма`:

```html
<input type="file" name="photos[]" multiple>
```

Получение:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` в этом случае вернёт **первый** файл из массива — для doc-первого-файла достаточно;
для всех — `getFiles()`.

## См. также

- [`HttpRequest::getFile()`](/ru/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/ru/docs/reference/server/http-request.html#getfiles)
- [Multipart upload — пример](/ru/docs/server/examples.html#multipart-upload-с-file-move)
