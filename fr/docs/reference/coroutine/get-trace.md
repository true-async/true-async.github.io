---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Obtenir la pile d'appels d'une coroutine suspendue."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Retourne la pile d'appels (backtrace) d'une coroutine suspendue. Si la coroutine n'est pas suspendue (pas encore démarrée, en cours d'exécution ou terminée), retourne `null`.

## Paramètres

**options**
: Un masque binaire d'options, similaire à `debug_backtrace()` :
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- inclure `$this` dans la trace
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- ne pas inclure les arguments des fonctions

**limit**
: Nombre maximum de cadres de pile. `0` -- pas de limite.

## Valeur de retour

`?array` -- un tableau de cadres de pile ou `null` si la coroutine n'est pas suspendue.

## Exemples

### Exemple #1 Obtenir la pile d'une coroutine suspendue

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // laisser la coroutine démarrer et se suspendre

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Exemple #2 Trace d'une coroutine terminée -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// Avant le démarrage -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// Après la terminaison -- null
var_dump($coroutine->getTrace()); // NULL
```

## Voir aussi

- [Coroutine::isSuspended](/fr/docs/reference/coroutine/is-suspended.html) -- Vérifier la suspension
- [Coroutine::getSuspendLocation](/fr/docs/reference/coroutine/get-suspend-location.html) -- Emplacement de suspension
- [Coroutine::getSpawnLocation](/fr/docs/reference/coroutine/get-spawn-location.html) -- Emplacement de création
