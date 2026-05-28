---
layout: docs
lang: fr
path_key: "/docs/reference/server/uploaded-file.html"
nav_active: docs
permalink: /fr/docs/reference/server/uploaded-file.html
page_title: "TrueAsync\\UploadedFile"
description: "TrueAsync\\UploadedFile — classe compatible PSR-7 pour les fichiers multipart téléversés. moveTo(), getStream(), getSize(), getClientFilename()."
---

# TrueAsync\UploadedFile

(PHP 8.6+, true_async_server 0.1+)

Représentation d'un fichier téléversé depuis `multipart/form-data`. Compatible PSR-7.

Obtenu via
[`HttpRequest::getFile()`](/fr/docs/reference/server/http-request.html#getfile) /
[`HttpRequest::getFiles()`](/fr/docs/reference/server/http-request.html#getfiles).

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

## Méthodes

### getStream

```php
public UploadedFile::getStream(): mixed
```

Resource de stream pour lire le fichier. On peut lire un fichier **partiellement téléversé**.

| | |
|---|---|
| return | `resource` ou `null` si indisponible |
| throws | `\RuntimeException` si le fichier a déjà été déplacé par `moveTo()` |

### moveTo

```php
public UploadedFile::moveTo(string $targetPath, int $mode = 0644): void
```

Déplace le fichier téléversé.

- Supporte chemins absolus et relatifs.
- Crée automatiquement les répertoires parents s'ils n'existent pas.
- Cross-FS : fallback automatique sur `copy() + unlink()`.

| | |
|---|---|
| throws | `\RuntimeException` si déjà déplacé ou erreur d'écriture |

### getSize

```php
public UploadedFile::getSize(): ?int
```

Taille du fichier en octets. `null` si inconnue (par ex. en streaming avant la fin).

### getError

```php
public UploadedFile::getError(): int
```

Code d'erreur au format PHP `UPLOAD_ERR_*`.

### getClientFilename

```php
public UploadedFile::getClientFilename(): ?string
```

Nom original du client, **tel quel** (sans modification). Limite 4 KB.

> **Ne pas faire confiance**. Le nom peut contenir n'importe quels octets (y compris des
> path-separators). Avant utilisation, soit sanitisez, soit générez un nom côté serveur.

### getClientMediaType

```php
public UploadedFile::getClientMediaType(): ?string
```

Type MIME du client (pris tel quel depuis le Content-Type de la partie). Non vérifié par le serveur.

### getClientCharset

```php
public UploadedFile::getClientCharset(): ?string
```

Charset depuis l'en-tête `Content-Type` de la partie (si indiqué).

### isReady

```php
public UploadedFile::isReady(): bool
```

`true` après téléversement complet et fermeture du descripteur temporaire.

### isValid

```php
public UploadedFile::isValid(): bool
```

Équivalent à `getError() === UPLOAD_ERR_OK`.

## Exemple

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

    // Vérifier que le client a envoyé une image (confiance en première approximation seulement)
    $declared = $avatar->getClientMediaType() ?? '';
    if (!str_starts_with($declared, 'image/')) {
        $res->setStatusCode(415)->json(['error' => 'not an image']); return;
    }

    // On génère le nom nous-mêmes, sans faire confiance au client
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

## Plusieurs fichiers dans un même champ

Formulaire HTML :

```html
<input type="file" name="photos[]" multiple>
```

Récupération :

```php
$files = $req->getFiles();
// $files['photos'] === [UploadedFile, UploadedFile, ...]

foreach ($files['photos'] as $file) {
    if (!$file->isValid()) continue;
    $file->moveTo('/var/storage/' . bin2hex(random_bytes(8)));
}
```

`getFile('photos')` renvoie alors le **premier** fichier du tableau — suffisant pour
doc-premier-fichier ; pour tous : `getFiles()`.

## Voir aussi

- [`HttpRequest::getFile()`](/fr/docs/reference/server/http-request.html#getfile)
- [`HttpRequest::getFiles()`](/fr/docs/reference/server/http-request.html#getfiles)
- [Multipart upload — exemple](/fr/docs/server/examples.html#multipart-upload-avec-file-move)
