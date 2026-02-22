---
layout: docs
lang: fr
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /fr/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Vérifier si une clé existe uniquement dans le contexte local."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Vérifie si une valeur avec la clé spécifiée existe **uniquement** dans le contexte courant (local).
Contrairement à `has()`, cette méthode ne recherche pas dans les contextes parents.

## Paramètres

**key**
: La clé à vérifier. Peut être une chaîne de caractères ou un objet.

## Valeur de retour

`true` si la clé est trouvée dans le contexte local, `false` sinon.

## Exemples

### Exemple #1 Différence entre has et hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() remonte la hiérarchie
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() vérifie uniquement le niveau courant
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Exemple #2 Vérification avec une clé objet

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Exemple #3 Initialisation conditionnelle d'une valeur locale

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Initialiser la valeur uniquement si elle n'est pas définie localement
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## Voir aussi

- [Context::has](/fr/docs/reference/context/has.html) --- Vérification avec parcours hiérarchique
- [Context::findLocal](/fr/docs/reference/context/find-local.html) --- Rechercher une valeur dans le contexte local
- [Context::getLocal](/fr/docs/reference/context/get-local.html) --- Obtenir une valeur locale (lève une exception)
