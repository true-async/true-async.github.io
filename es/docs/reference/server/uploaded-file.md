---
layout: docs
lang: es
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /es/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile: clase compatible PSR-7 para archivos multipart subidos. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Representación de un único archivo subido desde `multipart/form-data`. Compatible con PSR-7.

Se obtiene mediante
[`HttpRequest::getFile()`](/es/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/es/docs/reference/server/http-request.html#getfiles).

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

## Métodos

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream-resource para leer el archivo. Se puede leer un archivo **parcialmente subido**.

| | |
|---|---|
| return | `resource` o `null` si no está disponible |
| throws | `\RuntimeException` si el archivo ya se movió con `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Mueve el archivo subido.

- Admite rutas absolutas y relativas.
- Crea los directorios padre si no existen.
- Cross-FS: fallback automático a `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException` si ya se movió o ante un error de escritura |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Tamaño del archivo en bytes. `null` si se desconoce (por ejemplo en streaming antes de recibir
el final).

### getError

```php
public UploadedFile::getError(): int
```

Código de error en el formato `UPLOAD_ERR_*` de PHP.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Nombre original del cliente, **tal y como llegó** (sin modificaciones). Límite 4 KB.

> **No te fíes.** El nombre puede contener cualquier byte (incluidos separadores de ruta). Antes
> de usarlo: o lo saneas o generas el nombre en el servidor.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME que indica el cliente (tomado tal cual del Content-Type de la parte del navegador). El
servidor no lo verifica.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset de la cabecera `Content-Type` de la parte (si está indicado).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` tras la subida completa y el cierre del descriptor temporal.

### isValid

```php
public UploadedFile::isValid(): bool
```

Equivalente a `getError() === UPLOAD_ERR_OK`.

## Ejemplo

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

    // Comprobamos que el cliente envió una imagen (confiamos solo en primera aproximación)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Generamos el nombre nosotros, sin fiarnos del cliente
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

## Varios archivos en un mismo campo

Formulario HTML:

```html
<input type="file" name="photos[]" multiple>
```

Recepción:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` en este caso devuelve el **primer** archivo del array — basta para el caso
del primer archivo; para todos, `getFiles()`.

## Véase también

- [`HttpRequest::getFile()`](/es/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/es/docs/reference/server/http-request.html#getfiles)
- [Subida multipart, ejemplo](/es/docs/server/examples.html#subida-multipart-con-file-move)
