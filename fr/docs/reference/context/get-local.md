---
layout: docs
lang: fr
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /fr/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Obtenir une valeur uniquement du contexte local. Lève une exception si non trouvée."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Obtient une valeur par clé **uniquement** depuis le contexte courant (local).
Contrairement à `get()`, cette méthode ne recherche pas dans les contextes parents.

Si la clé n'est pas trouvée au niveau courant, une exception est levée.

## Paramètres

**key**
: La clé à rechercher. Peut être une chaîne de caractères ou un objet.

## Valeur de retour

La valeur associée à la clé dans le contexte local.

## Erreurs

- Lève `Async\ContextException` si la clé n'est pas trouvée dans le contexte local.

## Exemples

### Exemple #1 Obtention d'une valeur locale

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // La valeur est définie localement — getLocal fonctionne
    $taskId = current_context()->getLocal('task_id');
    echo "Tâche : {$taskId}\n"; // "Tâche : 42"
});
```

### Exemple #2 Exception lors de l'accès à une clé héritée

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() trouverait la valeur dans le parent
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() lève une exception — la valeur n'est pas dans le contexte local
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Non trouvé localement : " . $e->getMessage() . "\n";
    }
});
```

### Exemple #3 Utilisation avec une clé objet

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "Utilisateur : " . $session['user'] . "\n"; // "Utilisateur : admin"
});
```

## Voir aussi

- [Context::get](/fr/docs/reference/context/get.html) --- Obtenir une valeur avec recherche hiérarchique
- [Context::findLocal](/fr/docs/reference/context/find-local.html) --- Recherche sûre dans le contexte local
- [Context::hasLocal](/fr/docs/reference/context/has-local.html) --- Vérifier une clé dans le contexte local
