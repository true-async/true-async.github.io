---
layout: docs
lang: fr
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /fr/docs/reference/context/find.html
page_title: "Context::find"
description: "Rechercher une valeur par clé dans le contexte courant ou les contextes parents."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Recherche une valeur par clé dans le contexte courant. Si la clé n'est pas trouvée, la recherche continue
en remontant la hiérarchie des contextes parents. Retourne `null` si la valeur n'est trouvée à aucun niveau.

C'est une méthode de recherche sûre : elle ne lève jamais d'exception lorsqu'une clé est absente.

## Paramètres

**key**
: La clé à rechercher. Peut être une chaîne de caractères ou un objet.
  Lorsqu'un objet est utilisé comme clé, la recherche est effectuée par référence d'objet.

## Valeur de retour

La valeur associée à la clé, ou `null` si la clé n'est trouvée dans le contexte courant
ni dans aucun contexte parent.

## Exemples

### Exemple #1 Recherche d'une valeur par clé de type chaîne

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // La coroutine enfant trouve la valeur dans le contexte parent
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // La recherche d'une clé inexistante retourne null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Exemple #2 Recherche d'une valeur par clé objet

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Recherche par référence de clé objet
    $logger = current_context()->find($loggerKey);
    $logger->info('Message depuis la coroutine enfant');
});
```

### Exemple #3 Recherche hiérarchique

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Niveau racine
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Niveau 1 : ajout d'une valeur propre
    current_context()->set('user_id', 42);

    spawn(function() {
        // Niveau 2 : recherche de valeurs de tous les niveaux
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## Voir aussi

- [Context::get](/fr/docs/reference/context/get.html) --- Obtenir une valeur (lève une exception si absente)
- [Context::has](/fr/docs/reference/context/has.html) --- Vérifier si une clé existe
- [Context::findLocal](/fr/docs/reference/context/find-local.html) --- Rechercher uniquement dans le contexte local
- [Context::set](/fr/docs/reference/context/set.html) --- Définir une valeur dans le contexte
