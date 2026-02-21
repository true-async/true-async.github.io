---
layout: docs
lang: it
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /it/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Attende il completamento delle coroutine attive nello scope."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Attende il completamento di tutte le coroutine **attive** nello scope. Le coroutine zombie non vengono considerate durante l'attesa. Il parametro `$cancellation` consente di interrompere l'attesa anticipatamente.

## Parametri

`cancellation` — un oggetto `Awaitable` che, quando attivato, interrompera' l'attesa.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Attesa del completamento di tutte le coroutine

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completato\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completato\n";
});

// Attende il completamento con un timeout di 5 secondi
$scope->awaitCompletion(timeout(5000));
echo "Tutti i task completati\n";
```

### Esempio #2 Interruzione dell'attesa

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Task molto lungo
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Attesa interrotta dal timeout\n";
    $scope->cancel();
}
```

## Vedi anche

- [Scope::awaitAfterCancellation](/it/docs/reference/scope/await-after-cancellation.html) — Attende tutte le coroutine incluse le zombie
- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella tutte le coroutine
- [Scope::isFinished](/it/docs/reference/scope/is-finished.html) — Verifica se lo scope e' terminato
