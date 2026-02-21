---
layout: docs
lang: it
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /it/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Imposta un gestore delle eccezioni per le coroutine figlie."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Imposta un gestore delle eccezioni per le eccezioni lanciate nelle coroutine figlie dello scope. Quando una coroutine termina con un'eccezione non gestita, invece di propagare l'errore verso l'alto, viene chiamato il gestore specificato.

## Parametri

`exceptionHandler` — la funzione di gestione delle eccezioni. Accetta un `\Throwable` come argomento.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Gestione degli errori delle coroutine

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Errore coroutine: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Qualcosa e' andato storto");
});

$scope->awaitCompletion();
// Il log conterra': "Errore coroutine: Qualcosa e' andato storto"
```

### Esempio #2 Registrazione centralizzata degli errori

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Errore 1");
});

$scope->spawn(function() {
    throw new \LogicException("Errore 2");
});

$scope->awaitCompletion();

echo "Errori totali: " . count($errors) . "\n"; // Errori totali: 2
```

## Vedi anche

- [Scope::setChildScopeExceptionHandler](/it/docs/reference/scope/set-child-scope-exception-handler.html) — Gestore delle eccezioni per gli scope figli
- [Scope::finally](/it/docs/reference/scope/on-finally.html) — Callback al completamento dello scope
