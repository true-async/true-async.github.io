---
layout: docs
lang: it
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /it/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — ottieni il contesto privato della coroutine corrente."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Restituisce l'oggetto `Async\Context` associato alla coroutine corrente.

## Descrizione

```php
coroutine_context(): Async\Context
```

Restituisce il contesto **privato** della coroutine corrente. I dati impostati qui non sono visibili alle altre coroutine. Se il contesto per la coroutine non è stato ancora creato, viene creato automaticamente.

## Valori di ritorno

Un oggetto `Async\Context`.

## Esempi

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Successivamente nella stessa coroutine
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Non può vedere 'step' da un'altra coroutine
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## Vedi anche

- [current_context()](/it/docs/reference/current-context.html) — contesto dello Scope
- [root_context()](/it/docs/reference/root-context.html) — contesto globale
- [Context](/it/docs/components/context.html) — il concetto di contesto
