---
layout: docs
lang: fr
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /fr/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Créer un nouveau FileSystemWatcher et commencer à surveiller des fichiers ou un répertoire."
---

# FileSystemWatcher::__construct

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::__construct(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

Crée un observateur et commence immédiatement le suivi des modifications. Les événements sont mis en tampon dès la création, même si l'itération n'a pas encore commencé.

## Paramètres

**path**
: Le chemin vers un fichier ou un répertoire à surveiller.
  Si le chemin n'existe pas ou n'est pas accessible, une `Error` est levée.

**recursive**
: Si `true`, les répertoires imbriqués sont également surveillés.
  La valeur par défaut est `false`.

**coalesce**
: Mode de mise en tampon des événements.
  `true` (par défaut) --- les événements sont regroupés par clé `path/filename`.
  Les modifications répétées sur le même fichier fusionnent les drapeaux `renamed`/`changed` via un OU logique.
  `false` --- chaque événement du système d'exploitation est stocké comme un élément séparé dans un tampon circulaire.

## Erreurs/Exceptions

- `Error` --- le chemin n'existe pas ou n'est pas disponible pour la surveillance.

## Exemples

### Exemple #1 Surveillance d'un répertoire

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/mydir');

foreach ($watcher as $event) {
    echo "{$event->filename}\n";
    $watcher->close();
}
?>
```

### Exemple #2 Surveillance récursive en mode brut

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## Voir aussi

- [FileSystemWatcher::close](/fr/docs/reference/filesystem-watcher/close.html) --- Arrêter la surveillance
- [FileSystemWatcher](/fr/docs/components/filesystem-watcher.html) --- Vue d'ensemble du concept
