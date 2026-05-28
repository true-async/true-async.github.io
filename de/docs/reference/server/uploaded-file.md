---
layout: docs
lang: de
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /de/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — PSR-7-kompatible Klasse für hochgeladene Multipart-Dateien. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Repräsentation einer hochgeladenen Datei aus `multipart/form-data`. PSR-7-kompatibel.

Wird über
[`HttpRequest::getFile()`](/de/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/de/docs/reference/server/http-request.html#getfiles) bezogen.

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

## Methoden

### getStream

```php
public UploadedFile::getStream(): mixed
```

Stream-Resource zum Lesen der Datei. Auch eine **teilweise hochgeladene** Datei kann gelesen werden.

| | |
|---|---|
| return | `resource` oder `null`, falls nicht verfügbar |
| throws | `\RuntimeException`, wenn die Datei bereits per `moveTo()` verschoben wurde |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Verschiebt die hochgeladene Datei.

- Unterstützt absolute und relative Pfade.
- Erstellt fehlende Parent-Verzeichnisse automatisch.
- Cross-FS: automatischer Fallback auf `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException`, wenn bereits verschoben oder Schreibfehler |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Dateigröße in Bytes. `null`, wenn unbekannt (z. B. beim Streaming vor Empfang des Tail).

### getError

```php
public UploadedFile::getError(): int
```

Fehlercode im Format der PHP `UPLOAD_ERR_*`.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Originalname vom Client, **wie er ankam** (ohne Modifikation). Limit 4 KB.

> **Nicht vertrauen.** Der Name kann beliebige Bytes (inklusive Path-Separators) enthalten. Vor
> Gebrauch entweder bereinigen oder den Namen serverseitig generieren.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

MIME-Type vom Client (übernommen wie er ist aus dem Browser-Content-Type des Parts). Wird vom Server
nicht verifiziert.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset aus dem `Content-Type`-Header des Parts (falls angegeben).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` nach vollständigem Upload und Schließen des Temporär-Descriptors.

### isValid

```php
public UploadedFile::isValid(): bool
```

Äquivalent zu `getError() === UPLOAD_ERR_OK`.

## Beispiel

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

    // Prüfen, dass der Client ein Bild geschickt hat (nur erste Vertrauensebene)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // Namen selbst erzeugen, dem Client nicht vertrauen
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

## Mehrere Dateien in einem Feld

`HTML-Formular`:

```html
<input type="file" name="photos[]" multiple>
```

Empfang:

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` liefert in diesem Fall die **erste** Datei aus dem Array — für den Doc-First-File-Case
ausreichend; für alle Dateien `getFiles()`.

## Siehe auch

- [`HttpRequest::getFile()`](/de/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/de/docs/reference/server/http-request.html#getfiles)
- [Multipart Upload — Beispiel](/de/docs/server/examples.html#multipart-upload-mit-file-move)
