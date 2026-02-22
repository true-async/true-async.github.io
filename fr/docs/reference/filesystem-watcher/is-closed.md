---
layout: docs
lang: fr
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Vérifier si la surveillance du système de fichiers a été arrêtée."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Retourne `true` si la surveillance a été arrêtée --- `close()` a été appelé, le scope a été annulé ou une erreur s'est produite.

## Paramètres

Aucun paramètre.

## Valeur de retour

`true` --- l'observateur est fermé, `false` --- il est actif.

## Exemples

### Exemple #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## Voir aussi

- [FileSystemWatcher::close](/fr/docs/reference/filesystem-watcher/close.html) --- Arrêter la surveillance
