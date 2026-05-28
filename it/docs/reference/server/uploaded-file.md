---
layout: docs
lang: it
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /it/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile: classe compatibile PSR-7 per i file caricati via multipart. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Rappresentazione di un singolo file caricato da `multipart/form-data`. Compatibile con PSR-7.

Si ottiene tramite
[`HttpRequest::getFile()`](/it/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/it/docs/reference/server/http-request.html#getfiles).

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

## Metodi

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream resource per la lettura del file. Si può leggere un file **parzialmente caricato**.

| | |
|---|---|
| return | `resource` oppure `null` se non disponibile |
| throws | `\RuntimeException` se il file è già stato spostato con `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Sposta il file caricato.

- Supporta path assoluti e relativi.
- Crea automaticamente le directory parent quando mancano.
- Cross-FS: fallback automatico su `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException` se già spostato o in caso di errore di scrittura |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Dimensione del file in byte. `null` se sconosciuta (es. durante lo streaming, prima di ricevere la
coda).

### getError

```php
public UploadedFile::getError(): int
```

Codice di errore nel formato PHP `UPLOAD_ERR_*`.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Nome originale dal client, **così com'è arrivato** (senza modifiche). Limite 4 KB.

> **Non fidarti.** Il nome può contenere qualunque byte (inclusi separatori di path). Prima di
> usarlo, sanitizzalo oppure genera il nome lato server.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME dichiarato dal client (preso così com'è dal Content-Type della parte). Non è verificato dal
server.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset dall'header `Content-Type` della parte (se specificato).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` dopo l'upload completo e la chiusura del descrittore temporaneo.

### isValid

```php
public UploadedFile::isValid(): bool
```

Equivalente a `getError() === UPLOAD_ERR_OK`.

## Esempio

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

    // Verifica che il client abbia inviato un'immagine (fiducia solo in prima approssimazione)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Il nome lo generiamo noi, senza fidarci del client
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

## File multipli in uno stesso campo

Form HTML:

```html
<input type="file" name="photos[]" multiple>
```

Lettura:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

In questo caso `getFile('photos')` restituisce il **primo** file dell'array: basta se ti serve solo
quello; per averli tutti, usa `getFiles()`.

## Vedi anche

- [`HttpRequest::getFile()`](/it/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/it/docs/reference/server/http-request.html#getfiles)
- [Upload multipart — esempio](/it/docs/server/examples.html#upload-multipart-con-spostamento-del-file)
