---
layout: docs
lang: fr
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /fr/docs/reference/context/get.html
page_title: "Context::get"
description: "Obtenir une valeur du contexte. Lève une exception si la clé n'est pas trouvée."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Obtient une valeur par clé depuis le contexte courant. Si la clé n'est pas trouvée au niveau courant,
la recherche continue en remontant la hiérarchie des contextes parents.

Contrairement à `find()`, cette méthode lève une exception si la clé n'est trouvée à aucun niveau.
Utilisez `get()` lorsque la présence d'une valeur est une exigence obligatoire.

## Paramètres

**key**
: La clé à rechercher. Peut être une chaîne de caractères ou un objet.
  Lorsqu'un objet est utilisé comme clé, la recherche est effectuée par référence d'objet.

## Valeur de retour

La valeur associée à la clé.

## Erreurs

- Lève `Async\ContextException` si la clé n'est trouvée dans le contexte courant
  ni dans aucun contexte parent.

## Exemples

### Exemple #1 Obtention d'une valeur requise

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Obtenir une valeur qui doit exister
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Exemple #2 Gestion d'une clé manquante

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Clé non trouvée : " . $e->getMessage() . "\n";
}
```

### Exemple #3 Utilisation d'une clé objet

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // La clé objet garantit l'unicité sans conflits de noms
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## Voir aussi

- [Context::find](/fr/docs/reference/context/find.html) --- Recherche sûre (retourne null)
- [Context::has](/fr/docs/reference/context/has.html) --- Vérifier si une clé existe
- [Context::getLocal](/fr/docs/reference/context/get-local.html) --- Obtenir une valeur uniquement du contexte local
- [Context::set](/fr/docs/reference/context/set.html) --- Définir une valeur dans le contexte
