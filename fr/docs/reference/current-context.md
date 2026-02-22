---
layout: docs
lang: fr
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /fr/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — obtenir le contexte du Scope courant."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Retourne l'objet `Async\Context` lié au Scope courant.

## Description

```php
current_context(): Async\Context
```

Si le contexte du Scope courant n'a pas encore été créé, il est créé automatiquement.
Les valeurs définies dans ce contexte sont visibles par toutes les coroutines du Scope courant via `find()`.

## Valeurs de retour

Un objet `Async\Context`.

## Exemples

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Voit la valeur du scope parent
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## Voir aussi

- [coroutine_context()](/fr/docs/reference/coroutine-context.html) — Contexte de la coroutine
- [root_context()](/fr/docs/reference/root-context.html) — Contexte global
- [Context](/fr/docs/components/context.html) — Le concept de contexte
