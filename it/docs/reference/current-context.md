---
layout: docs
lang: it
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /it/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — ottieni il contesto dello Scope corrente."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Restituisce l'oggetto `Async\Context` associato allo Scope corrente.

## Descrizione

```php
current_context(): Async\Context
```

Se il contesto per lo Scope corrente non è stato ancora creato, viene creato automaticamente.
I valori impostati in questo contesto sono visibili a tutte le coroutine nello Scope corrente tramite `find()`.

## Valori di ritorno

Un oggetto `Async\Context`.

## Esempi

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Vede il valore dallo scope genitore
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## Vedi anche

- [coroutine_context()](/it/docs/reference/coroutine-context.html) — contesto della coroutine
- [root_context()](/it/docs/reference/root-context.html) — contesto globale
- [Context](/it/docs/components/context.html) — il concetto di contesto
