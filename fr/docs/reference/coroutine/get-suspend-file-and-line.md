---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Obtenir le fichier et la ligne où la coroutine est suspendue."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Retourne le fichier et le numéro de ligne où la coroutine a été suspendue (ou a été suspendue pour la dernière fois).

## Valeur de retour

`array` -- un tableau de deux éléments :
- `[0]` -- nom du fichier (`string` ou `null`)
- `[1]` -- numéro de ligne (`int`)

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // laisser la coroutine se suspendre

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## Voir aussi

- [Coroutine::getSuspendLocation](/fr/docs/reference/coroutine/get-suspend-location.html) -- Emplacement de suspension sous forme de chaîne
- [Coroutine::getSpawnFileAndLine](/fr/docs/reference/coroutine/get-spawn-file-and-line.html) -- Fichier et ligne de création
