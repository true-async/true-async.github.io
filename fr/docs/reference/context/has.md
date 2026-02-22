---
layout: docs
lang: fr
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /fr/docs/reference/context/has.html
page_title: "Context::has"
description: "Vérifier si une clé existe dans le contexte courant ou les contextes parents."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Vérifie si une valeur avec la clé spécifiée existe dans le contexte courant ou dans l'un
des contextes parents. La recherche est effectuée en remontant la hiérarchie.

## Paramètres

**key**
: La clé à vérifier. Peut être une chaîne de caractères ou un objet.

## Valeur de retour

`true` si la clé est trouvée dans le contexte courant ou dans un contexte parent, `false` sinon.

## Exemples

### Exemple #1 Vérification d'une clé avant utilisation

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale : {$locale}\n"; // "Locale : ru_RU"
    } else {
        echo "Locale non définie, utilisation de la valeur par défaut\n";
    }
});
```

### Exemple #2 Vérification avec une clé objet

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Le cache est disponible\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Exemple #3 Vérification hiérarchique

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (depuis la racine)
        var_dump(current_context()->has('local_flag'));   // true (depuis le parent)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## Voir aussi

- [Context::find](/fr/docs/reference/context/find.html) --- Rechercher une valeur par clé
- [Context::get](/fr/docs/reference/context/get.html) --- Obtenir une valeur (lève une exception)
- [Context::hasLocal](/fr/docs/reference/context/has-local.html) --- Vérifier uniquement dans le contexte local
