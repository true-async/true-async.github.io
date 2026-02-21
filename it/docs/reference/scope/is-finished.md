---
layout: docs
lang: it
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /it/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Verifica se lo scope e' terminato."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Verifica se tutte le coroutine nello scope sono terminate. Uno scope e' considerato terminato quando tutte le sue coroutine (inclusi gli scope figli) hanno completato l'esecuzione.

## Valore di ritorno

`bool` — `true` se tutte le coroutine dello scope sono terminate, `false` altrimenti.

## Esempi

### Esempio #1 Verifica del completamento dello scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## Vedi anche

- [Scope::isClosed](/it/docs/reference/scope/is-closed.html) — Verifica se lo scope e' chiuso
- [Scope::isCancelled](/it/docs/reference/scope/is-cancelled.html) — Verifica se lo scope e' stato cancellato
- [Scope::awaitCompletion](/it/docs/reference/scope/await-completion.html) — Attende il completamento delle coroutine
