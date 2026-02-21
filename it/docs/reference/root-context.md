---
layout: docs
lang: it
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /it/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — ottieni il contesto radice globale visibile da tutti gli scope."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Restituisce l'oggetto globale radice `Async\Context`, condiviso in tutta la richiesta.

## Descrizione

```php
root_context(): Async\Context
```

Restituisce il contesto di livello superiore. I valori impostati qui sono visibili tramite `find()` da qualsiasi contesto nella gerarchia.

## Valori di ritorno

Un oggetto `Async\Context`.

## Esempi

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Imposta configurazione globale
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Accessibile da qualsiasi coroutine tramite find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## Vedi anche

- [current_context()](/it/docs/reference/current-context.html) — contesto dello Scope
- [coroutine_context()](/it/docs/reference/coroutine-context.html) — contesto della coroutine
- [Context](/it/docs/components/context.html) — il concetto di contesto
