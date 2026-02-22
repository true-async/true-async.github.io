---
layout: docs
lang: fr
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /fr/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Supprimer une valeur par clé du contexte."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Supprime une valeur par clé du contexte courant. La suppression n'affecte que le contexte
local --- les valeurs dans les contextes parents ne sont pas modifiées.

La méthode retourne l'objet `Context`, permettant le chaînage de méthodes.

## Paramètres

**key**
: La clé à supprimer. Peut être une chaîne de caractères ou un objet.

## Valeur de retour

L'objet `Context` pour le chaînage de méthodes.

## Exemples

### Exemple #1 Suppression d'une valeur du contexte

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Supprimer les données temporaires
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Exemple #2 Suppression avec une clé objet

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Supprimer les données sensibles après utilisation
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Exemple #3 La suppression n'affecte pas le contexte parent

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Le contexte enfant voit la valeur du parent
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Définir une valeur locale avec la même clé
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Supprimer la valeur locale
    current_context()->unset('shared');

    // Après suppression de la valeur locale — la valeur parente est à nouveau visible via find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Exemple #4 Chaînage de méthodes avec unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Effacer plusieurs clés avec le chaînage
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## Voir aussi

- [Context::set](/fr/docs/reference/context/set.html) --- Définir une valeur dans le contexte
- [Context::find](/fr/docs/reference/context/find.html) --- Rechercher une valeur par clé
- [Context::findLocal](/fr/docs/reference/context/find-local.html) --- Rechercher une valeur dans le contexte local
