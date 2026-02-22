---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — obtenir le contexte privé de la coroutine courante."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Retourne l'objet `Async\Context` lié à la coroutine courante.

## Description

```php
coroutine_context(): Async\Context
```

Retourne le contexte **privé** de la coroutine courante. Les données définies ici ne sont pas visibles par les autres coroutines. Si le contexte de la coroutine n'a pas encore été créé, il est créé automatiquement.

## Valeurs de retour

Un objet `Async\Context`.

## Exemples

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Plus tard dans la même coroutine
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Ne peut pas voir 'step' depuis une autre coroutine
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## Voir aussi

- [current_context()](/fr/docs/reference/current-context.html) — Contexte du Scope
- [root_context()](/fr/docs/reference/root-context.html) — Contexte global
- [Context](/fr/docs/components/context.html) — Le concept de contexte
