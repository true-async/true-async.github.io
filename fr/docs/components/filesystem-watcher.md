---
layout: docs
lang: fr
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /fr/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher dans TrueAsync -- un observateur persistant du systeme de fichiers avec support de l'iteration foreach, buffering d'evenements et deux modes de stockage."
---

# FileSystemWatcher : surveillance du systeme de fichiers

## Qu'est-ce que FileSystemWatcher

`Async\FileSystemWatcher` est un observateur persistant des modifications de fichiers et de repertoires.
Contrairement aux approches ponctuelles, FileSystemWatcher s'execute en continu et delivre les evenements via l'iteration standard `foreach` :

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

L'iteration suspend automatiquement la coroutine lorsque le buffer est vide et la reprend lorsqu'un nouvel evenement arrive.

## FileSystemEvent

Chaque evenement est un objet `Async\FileSystemEvent` avec quatre proprietes readonly :

| Propriete  | Type      | Description                                           |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | Le chemin passe au constructeur de `FileSystemWatcher` |
| `filename` | `?string` | Le nom du fichier qui a declenche l'evenement (peut etre `null`) |
| `renamed`  | `bool`    | `true` -- le fichier a ete cree, supprime ou renomme  |
| `changed`  | `bool`    | `true` -- le contenu du fichier a ete modifie         |

## Deux modes de buffering

### Fusion (par defaut)

En mode fusion, les evenements sont regroupes par la cle `path/filename`. Si un fichier a change plusieurs fois avant que l'iterateur ne l'ait traite, un seul evenement avec les drapeaux fusionnes reste dans le buffer :

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- par defaut
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

C'est optimal pour les scenarios typiques : hot-reload, reconstruction a la modification de la configuration, synchronisation.

### Brut

En mode brut, chaque evenement du systeme d'exploitation est stocke comme un element separe dans un buffer circulaire :

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Adapte lorsque l'ordre exact et le nombre d'evenements importent -- audit, journalisation, replication.

## Constructeur

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- chemin vers un fichier ou un repertoire. Si le chemin n'existe pas, une `Error` est lancee.

**`recursive`** -- si `true`, les repertoires imbriques sont egalement surveilles.

**`coalesce`** -- mode de buffering : `true` -- fusion d'evenements (HashTable), `false` -- tous les evenements (buffer circulaire).

La surveillance demarre immediatement a la creation de l'objet. Les evenements sont mis en buffer meme avant le debut de l'iteration.

## Cycle de vie

### close()

Arrete la surveillance. L'iteration courante se termine apres le traitement des evenements restants dans le buffer. Idempotent -- les appels repetes sont surs.

```php
<?php
$watcher->close();
?>
```

### isClosed()

```php
<?php
$watcher->isClosed(); // bool
?>
```

### Fermeture automatique

Si l'objet `FileSystemWatcher` est detruit (sort du scope), la surveillance s'arrete automatiquement.

## Exemples

### Hot-Reload de la configuration

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Configuration modifiee : {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Surveillance avec limite de temps

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/uploads');

spawn(function() use ($watcher) {
    delay(30_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processUpload($event->filename);
}

echo "Surveillance terminee\n";
?>
```

### Surveillance de plusieurs repertoires

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

$dirs = ['/var/log/app', '/var/log/nginx', '/var/log/postgres'];

foreach ($dirs as $dir) {
    spawn(function() use ($dir) {
        $watcher = new FileSystemWatcher($dir);

        foreach ($watcher as $event) {
            echo "[{$dir}] {$event->filename}\n";
        }
    });
}
?>
```

### Mode brut pour l'audit

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/secure/data', coalesce: false);

    foreach ($watcher as $event) {
        $type = $event->renamed ? 'RENAME' : 'CHANGE';
        auditLog("[{$type}] {$event->path}/{$event->filename}");
    }
});
?>
```

## Annulation via Scope

FileSystemWatcher se termine correctement lorsque le scope est annule :

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/test');

    spawn(function() use ($watcher) {
        foreach ($watcher as $event) {
            echo "{$event->filename}\n";
        }
        echo "Iteration terminee\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## Voir aussi

- [Coroutines](/fr/docs/components/coroutines.html) -- l'unite de base de la concurrence
- [Channel](/fr/docs/components/channels.html) -- channels CSP pour le transfert de donnees
- [Annulation](/fr/docs/components/cancellation.html) -- le mecanisme d'annulation
