---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Obtenir le fichier et la ligne où la coroutine a été créée."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Retourne le fichier et le numéro de ligne où `spawn()` a été appelé pour créer cette coroutine.

## Valeur de retour

`array` -- un tableau de deux éléments :
- `[0]` -- nom du fichier (`string` ou `null`)
- `[1]` -- numéro de ligne (`int`)

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## Voir aussi

- [Coroutine::getSpawnLocation](/fr/docs/reference/coroutine/get-spawn-location.html) -- Emplacement de création sous forme de chaîne
- [Coroutine::getSuspendFileAndLine](/fr/docs/reference/coroutine/get-suspend-file-and-line.html) -- Fichier et ligne de suspension
