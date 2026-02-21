---
layout: docs
lang: it
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /it/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Avvia una coroutine nello scope specificato."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Avvia una nuova coroutine all'interno dello scope specificato. La coroutine sara' legata allo scope e gestita dal suo ciclo di vita: quando lo scope viene cancellato o chiuso, anche tutte le sue coroutine saranno interessate.

## Parametri

`callable` — la closure da eseguire come coroutine.

`params` — argomenti da passare alla closure.

## Valore di ritorno

`Coroutine` — l'oggetto coroutine avviato.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Ciao da una coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Esempio #2 Passaggio di parametri

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Recupero $url con timeout {$timeout}ms\n";
    // ... esegui la richiesta
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) — Funzione globale per avviare coroutine
- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella tutte le coroutine dello scope
- [Scope::awaitCompletion](/it/docs/reference/scope/await-completion.html) — Attende il completamento delle coroutine
