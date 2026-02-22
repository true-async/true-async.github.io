---
layout: docs
lang: fr
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /fr/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Rechercher une valeur uniquement dans le contexte local (sans parcourir les contextes parents)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Recherche une valeur par clé **uniquement** dans le contexte courant (local). Contrairement à `find()`,
cette méthode ne remonte pas la hiérarchie des contextes parents.

Retourne `null` si la clé n'est pas trouvée au niveau courant.

## Paramètres

**key**
: La clé à rechercher. Peut être une chaîne de caractères ou un objet.

## Valeur de retour

La valeur associée à la clé dans le contexte local, ou `null` si la clé n'est pas trouvée.

## Exemples

### Exemple #1 Différence entre find et findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() remonte la hiérarchie
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() recherche uniquement au niveau courant
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Exemple #2 Utilisation avec une clé objet

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // La clé objet du parent n'est pas visible via findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Exemple #3 Remplacement d'une valeur parente

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Vérifier si la valeur est remplacée localement
    if (current_context()->findLocal('timeout') === null) {
        // Utiliser la valeur héritée, mais possibilité de la remplacer
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## Voir aussi

- [Context::find](/fr/docs/reference/context/find.html) --- Recherche avec parcours hiérarchique
- [Context::getLocal](/fr/docs/reference/context/get-local.html) --- Obtenir une valeur locale (lève une exception)
- [Context::hasLocal](/fr/docs/reference/context/has-local.html) --- Vérifier une clé dans le contexte local
