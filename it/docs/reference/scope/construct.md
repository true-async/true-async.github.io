---
layout: docs
lang: it
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /it/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Crea un nuovo Scope radice."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Crea un nuovo `Scope` radice. Uno scope radice non ha uno scope genitore e funge da unita' indipendente per la gestione del ciclo di vita delle coroutine.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in un nuovo scope\n";
});

$scope->awaitCompletion();
```

### Esempio #2 Creazione di scope indipendenti multipli

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// La cancellazione di uno scope non influenza l'altro
$scopeA->cancel();

// $scopeB continua a funzionare
$scopeB->awaitCompletion();
```

## Vedi anche

- [Scope::inherit](/it/docs/reference/scope/inherit.html) — Crea uno Scope figlio
- [Scope::spawn](/it/docs/reference/scope/spawn.html) — Avvia una coroutine nello scope
