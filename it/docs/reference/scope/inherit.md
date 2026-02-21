---
layout: docs
lang: it
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /it/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Crea un nuovo Scope che eredita dallo scope specificato o corrente."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Crea un nuovo `Scope` che eredita dallo scope genitore specificato. Se il parametro `$parentScope` non viene fornito (o e' `null`), il nuovo scope eredita dallo scope attivo corrente.

Lo scope figlio eredita i gestori delle eccezioni e le politiche di cancellazione dal genitore.

## Parametri

`parentScope` — lo scope genitore da cui il nuovo scope ereditera'. Se `null`, viene utilizzato lo scope attivo corrente.

## Valore di ritorno

`Scope` — un nuovo scope figlio.

## Esempi

### Esempio #1 Creazione di uno scope figlio da quello corrente

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // All'interno della coroutine, lo scope corrente e' $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "In esecuzione nello scope figlio\n";
    });

    $childScope->awaitCompletion();
});
```

### Esempio #2 Specifica esplicita dello scope genitore

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine nello scope figlio\n";
});

// La cancellazione del genitore cancella anche lo scope figlio
$rootScope->cancel();
```

## Vedi anche

- [Scope::\_\_construct](/it/docs/reference/scope/construct.html) — Crea uno Scope radice
- [Scope::getChildScopes](/it/docs/reference/scope/get-child-scopes.html) — Ottieni gli scope figli
- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Cancella e chiudi lo scope
