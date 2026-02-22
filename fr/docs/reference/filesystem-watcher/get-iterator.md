---
layout: docs
lang: fr
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /fr/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Obtenir un itérateur asynchrone pour parcourir les événements du système de fichiers avec foreach."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Retourne un itérateur pour utilisation avec `foreach`. Appelé automatiquement lors de l'utilisation de `foreach ($watcher as $event)`.

L'itérateur produit des objets `Async\FileSystemEvent`. Lorsque le tampon est vide, la coroutine est suspendue jusqu'à l'arrivée d'un nouvel événement. L'itération se termine lorsque l'observateur est fermé et que le tampon est épuisé.

## Paramètres

Aucun paramètre.

## Valeur de retour

`Iterator` --- un itérateur produisant des objets `Async\FileSystemEvent`.

## Erreurs/Exceptions

- `Error` --- si l'itérateur est utilisé en dehors d'une coroutine.

## Exemples

### Exemple #1 Utilisation standard avec foreach

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/dir');

    spawn(function() use ($watcher) {
        delay(5000);
        $watcher->close();
    });

    foreach ($watcher as $event) {
        echo "Événement : {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Itération terminée\n";
});
?>
```

### Exemple #2 Interruption avec break

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

foreach ($watcher as $event) {
    if ($event->filename === 'stop.flag') {
        break;
    }
    processEvent($event);
}

$watcher->close();
?>
```

## Voir aussi

- [FileSystemWatcher](/fr/docs/components/filesystem-watcher.html) --- Vue d'ensemble du concept
- [FileSystemWatcher::close](/fr/docs/reference/filesystem-watcher/close.html) --- Arrêter la surveillance
