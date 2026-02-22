---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Marquer la coroutine comme haute priorité pour l'ordonnanceur."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Marque la coroutine comme haute priorité. L'ordonnanceur donnera la préférence à ces coroutines lors de la sélection de la prochaine tâche à exécuter.

La méthode retourne le même objet coroutine, permettant une interface fluide.

## Valeur de retour

`Coroutine` -- le même objet coroutine (interface fluide).

## Exemples

### Exemple #1 Définition de la priorité

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### Exemple #2 Interface fluide

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) -- Créer une coroutine
