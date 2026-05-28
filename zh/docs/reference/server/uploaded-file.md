---
layout: docs
lang: zh
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /zh/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile —— PSR-7 兼容的 multipart 上传文件类。moveTo()、getStream()、getSize()、getClientFilename()。"
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

`multipart/form-data` 中单个上传文件的表示。PSR-7 兼容。

通过
[`HttpRequest::getFile()`](/zh/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/zh/docs/reference/server/http-request.html#getfiles) 获取。

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

## 方法

### getStream

```php
public UploadedFile::getStream(): mixed
```

读取文件的 stream resource。可以读取**尚未完整上传**的文件。

| | |
|---|---|
| 返回 | `resource`，或在不可用时返回 `null` |
| 抛出 | 已经被 `moveTo()` 移动过则 `\RuntimeException` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

移动上传文件。

- 支持绝对路径和相对路径。
- 如父目录不存在会自动创建。
- 跨文件系统：自动回退到 `copy() + unlink()`。

| | |
|---|---|
| 抛出 | 已移动过或写入失败则 `\RuntimeException` |

### getSize

```php
public UploadedFile::getSize(): ?int
```

文件大小（字节）。在 streaming 尚未拿到尾部时可能未知，此时返回 `null`。

### getError

```php
public UploadedFile::getError(): int
```

PHP `UPLOAD_ERR_*` 格式的错误码。

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

客户端原始文件名，**原样保留**（未做任何处理）。上限 4 KB。

> **不要相信它**。文件名可能包含任意字节（包括路径分隔符）。使用前要么先清洗，
> 要么在服务端自行生成新名字。

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

客户端声明的 MIME（直接来自该 part 的 Content-Type）。服务端不会校验。

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

该 part 的 `Content-Type` 中的 charset（如果有）。

### isReady

```php
public UploadedFile::isReady(): bool
```

完整接收完毕、临时句柄已关闭时返回 `true`。

### isValid

```php
public UploadedFile::isValid(): bool
```

等价于 `getError() === UPLOAD_ERR_OK`。

## 示例

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

    // 检查客户端声称的是图片（只做粗略可信判断）
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // 服务端自己生成文件名，不信任客户端
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

## 同一字段下的多文件

HTML 表单：

```html
<input type="file" name="photos[]" multiple>
```

获取：

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

此时 `getFile('photos')` 返回数组里的**第一个**文件 —— 只取第一个时够用；
要全部则用 `getFiles()`。

## 也可参考

- [`HttpRequest::getFile()`](/zh/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/zh/docs/reference/server/http-request.html#getfiles)
- [Multipart 上传示例](/zh/docs/server/examples.html#multipart-上传并-move)
