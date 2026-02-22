---
layout: docs
lang: fr
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /fr/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Créer un nouveau pool de ressources."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Crée un nouveau pool de ressources. Le pool gère un ensemble d'objets réutilisables
(connexions, clients, descripteurs de fichiers, etc.), en les créant
et les détruisant automatiquement selon les besoins.

## Paramètres

**factory**
: Une fonction de fabrique pour créer une nouvelle ressource. Appelée chaque fois
  que le pool a besoin d'une nouvelle ressource et que le nombre actuel est inférieur à `max`.
  Doit retourner une ressource prête à l'emploi.

**destructor**
: Une fonction pour détruire proprement une ressource. Appelée lorsque le pool est fermé
  ou lorsqu'une ressource est retirée (par exemple, après un échec de vérification de santé).
  `null` --- la ressource est simplement retirée du pool sans actions supplémentaires.

**healthcheck**
: Une fonction de vérification de santé des ressources. Prend une ressource, retourne `bool`.
  `true` --- la ressource est saine, `false` --- la ressource sera détruite et remplacée.
  `null` --- aucune vérification de santé n'est effectuée.

**beforeAcquire**
: Un hook appelé avant qu'une ressource ne soit distribuée. Prend la ressource.
  Peut être utilisé pour préparer la ressource (par exemple, réinitialiser l'état).
  `null` --- pas de hook.

**beforeRelease**
: Un hook appelé avant qu'une ressource ne soit retournée au pool. Prend la ressource,
  retourne `bool`. S'il retourne `false`, la ressource est détruite au lieu d'être
  retournée au pool.
  `null` --- pas de hook.

**min**
: Le nombre minimum de ressources dans le pool. Lors de la création du pool,
  `min` ressources sont créées immédiatement. Par défaut `0`.

**max**
: Le nombre maximum de ressources dans le pool. Lorsque la limite est atteinte,
  les appels à `acquire()` se bloquent jusqu'à ce qu'une ressource soit libérée.
  Par défaut `10`.

**healthcheckInterval**
: L'intervalle de vérification de santé en arrière-plan des ressources en millisecondes.
  `0` --- la vérification en arrière-plan est désactivée (vérification uniquement à l'acquisition).

## Exemples

### Exemple #1 Pool de connexions PDO

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO is closed automatically when removed
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // check every 30 seconds
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Exemple #2 Pool avec hooks

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // reset to default database
    },
    beforeRelease: function(RedisClient $r): bool {
        // If the connection is broken — destroy the resource
        return $r->isConnected();
    },
    max: 5
);
```

## Voir aussi

- [Pool::acquire](/fr/docs/reference/pool/acquire.html) --- Acquérir une ressource du pool
- [Pool::release](/fr/docs/reference/pool/release.html) --- Libérer une ressource dans le pool
- [Pool::close](/fr/docs/reference/pool/close.html) --- Fermer le pool
