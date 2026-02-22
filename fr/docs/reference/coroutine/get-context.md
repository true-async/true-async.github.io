---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Obtenir le contexte local d'une coroutine."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Retourne le contexte local de la coroutine. Le contexte est créé de manière paresseuse lors du premier accès.

Le contexte permet de stocker des données liées à une coroutine spécifique et de les transmettre aux coroutines enfants.

## Valeur de retour

`Async\Context` -- l'objet contexte de la coroutine.

## Exemples

### Exemple #1 Accès au contexte

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## Voir aussi

- [Context](/fr/docs/components/context.html) -- Concept de contexte
- [current_context()](/fr/docs/reference/current-context.html) -- Obtenir le contexte de la coroutine courante
