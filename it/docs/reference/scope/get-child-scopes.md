---
layout: docs
lang: it
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /it/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Restituisce un array degli scope figli."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Restituisce un array di tutti gli scope figli creati tramite `Scope::inherit()` dallo scope specificato. Utile per il monitoraggio e il debug della gerarchia degli scope.

## Valore di ritorno

`array` — un array di oggetti `Scope` che sono figli dello scope specificato.

## Esempi

### Esempio #1 Ottenere gli scope figli

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Esempio #2 Monitoraggio dello stato degli scope figli

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancellato',
        $child->isFinished()  => 'terminato',
        $child->isClosed()    => 'chiuso',
        default               => 'attivo',
    };
    echo "Scope: $status\n";
}
```

## Vedi anche

- [Scope::inherit](/it/docs/reference/scope/inherit.html) — Crea uno scope figlio
- [Scope::setChildScopeExceptionHandler](/it/docs/reference/scope/set-child-scope-exception-handler.html) — Gestore delle eccezioni per gli scope figli
