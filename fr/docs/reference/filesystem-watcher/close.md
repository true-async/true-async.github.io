---
layout: docs
lang: fr
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /fr/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Arrêter la surveillance du système de fichiers et terminer l'itération."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Arrête la surveillance du système de fichiers. L'itération via `foreach` se termine après le traitement des événements restants dans le tampon.

Idempotent --- les appels répétés sont sans danger.

## Paramètres

Aucun paramètre.

## Exemples

### Exemple #1 Fermeture après réception de l'événement souhaité

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Fichier marqueur détecté\n";
?>
```

### Exemple #2 Fermeture depuis une autre coroutine

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/data');

spawn(function() use ($watcher) {
    delay(10_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processEvent($event);
}

echo "Surveillance terminée par délai d'attente\n";
?>
```

## Voir aussi

- [FileSystemWatcher::isClosed](/fr/docs/reference/filesystem-watcher/is-closed.html) --- Vérifier l'état
- [FileSystemWatcher::__construct](/fr/docs/reference/filesystem-watcher/construct.html) --- Créer un observateur
