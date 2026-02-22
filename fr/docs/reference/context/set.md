---
layout: docs
lang: fr
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /fr/docs/reference/context/set.html
page_title: "Context::set"
description: "Définir une valeur dans le contexte par clé."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Définit une valeur dans le contexte courant avec la clé spécifiée. Par défaut, si la clé
existe déjà, la valeur n'est **pas écrasée**. Pour forcer l'écrasement, utilisez
le paramètre `replace = true`.

La méthode retourne l'objet `Context`, permettant le chaînage de méthodes.

## Paramètres

**key**
: La clé pour laquelle définir la valeur. Peut être une chaîne de caractères ou un objet.
  Les clés objet sont utiles pour éviter les conflits de noms entre bibliothèques.

**value**
: La valeur à stocker. Peut être de n'importe quel type.

**replace**
: Si `false` (par défaut) --- ne pas écraser une valeur existante.
  Si `true` --- écraser la valeur même si la clé existe déjà.

## Valeur de retour

L'objet `Context` pour le chaînage de méthodes.

## Exemples

### Exemple #1 Définition de valeurs avec des clés de type chaîne

```php
<?php

use function Async\current_context;

// Chaînage de méthodes
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Exemple #2 Comportement sans écrasement

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Définition à nouveau sans replace — la valeur NE change PAS
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// Avec replace = true — la valeur est écrasée
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Exemple #3 Clés objet pour l'isolation des bibliothèques

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Chaque bibliothèque utilise sa propre clé objet
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialisé');
});
```

### Exemple #4 Transmission du contexte aux coroutines enfants

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Contexte parent
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Les coroutines enfants héritent des valeurs via find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Traitement de la requête : {$traceId}\n";

    // La coroutine enfant ajoute sa propre valeur
    current_context()->set('handler', 'user_controller');
});
```

## Voir aussi

- [Context::unset](/fr/docs/reference/context/unset.html) --- Supprimer une valeur par clé
- [Context::find](/fr/docs/reference/context/find.html) --- Rechercher une valeur par clé
- [Context::get](/fr/docs/reference/context/get.html) --- Obtenir une valeur (lève une exception)
- [current_context()](/fr/docs/reference/current-context.html) --- Obtenir le contexte du Scope courant
