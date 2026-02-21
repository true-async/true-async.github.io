---
layout: docs
lang: it
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /it/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Imposta un gestore delle eccezioni per gli Scope figli."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Imposta un gestore delle eccezioni per le eccezioni lanciate negli scope figli. Quando uno scope figlio termina con un errore, questo gestore viene chiamato, impedendo all'eccezione di propagarsi allo scope genitore.

## Parametri

`exceptionHandler` — la funzione di gestione delle eccezioni per gli scope figli. Accetta un `\Throwable` come argomento.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Cattura degli errori degli scope figli

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Errore nello scope figlio: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Errore dello scope figlio");
});

$childScope->awaitCompletion();
// Errore gestito, non si propaga a $parentScope
```

### Esempio #2 Isolamento degli errori tra moduli

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Errore del modulo: " . $e->getMessage());
});

// Ogni modulo nel proprio scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // Un errore qui non influenzera' $cacheScope
    throw new \RuntimeException("Autenticazione fallita");
});

$cacheScope->spawn(function() {
    echo "La cache funziona correttamente\n";
});

$appScope->awaitCompletion();
```

## Vedi anche

- [Scope::setExceptionHandler](/it/docs/reference/scope/set-exception-handler.html) — Gestore delle eccezioni per le coroutine
- [Scope::inherit](/it/docs/reference/scope/inherit.html) — Crea uno scope figlio
- [Scope::getChildScopes](/it/docs/reference/scope/get-child-scopes.html) — Ottieni gli scope figli
