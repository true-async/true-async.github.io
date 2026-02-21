---
layout: docs
lang: it
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /it/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Registra un callback da invocare al completamento dello scope."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Registra una funzione callback che verra' eseguita al completamento dello scope. Questo e' l'equivalente di un blocco `finally` per uno scope, garantendo che il codice di pulizia venga eseguito indipendentemente da come lo scope e' terminato (normalmente, per cancellazione o con un errore).

## Parametri

`callback` — la closure che verra' chiamata al completamento dello scope.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Pulizia delle risorse

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completato, pulizia delle risorse\n";
    // Chiudi connessioni, elimina file temporanei
});

$scope->spawn(function() {
    echo "Esecuzione del task\n";
});

$scope->awaitCompletion();
// Output: "Esecuzione del task"
// Output: "Scope completato, pulizia delle risorse"
```

### Esempio #2 Callback multipli

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Chiusura connessione al database\n";
});

$scope->finally(function() {
    echo "Scrittura metriche\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Entrambi i callback verranno invocati al completamento dello scope
```

## Vedi anche

- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Chiudi lo scope
- [Scope::isFinished](/it/docs/reference/scope/is-finished.html) — Verifica se lo scope e' terminato
- [Coroutine::finally](/it/docs/reference/coroutine/on-finally.html) — Callback al completamento della coroutine
