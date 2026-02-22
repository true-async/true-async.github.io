---
layout: docs
lang: fr
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /fr/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — obtenir le contexte racine global visible depuis tous les scopes."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Retourne l'objet `Async\Context` racine global, partagé sur l'ensemble de la requête.

## Description

```php
root_context(): Async\Context
```

Retourne le contexte de niveau supérieur. Les valeurs définies ici sont visibles via `find()` depuis n'importe quel contexte dans la hiérarchie.

## Valeurs de retour

Un objet `Async\Context`.

## Exemples

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Définir la configuration globale
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Accessible depuis n'importe quelle coroutine via find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## Voir aussi

- [current_context()](/fr/docs/reference/current-context.html) — Contexte du Scope
- [coroutine_context()](/fr/docs/reference/coroutine-context.html) — Contexte de la coroutine
- [Context](/fr/docs/components/context.html) — Le concept de contexte
