---
layout: docs
lang: it
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /it/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Contrassegna lo scope come non sicuro — le coroutine ricevono la cancellazione invece di diventare zombie."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Contrassegna lo scope come "non sicuro". Quando `disposeSafely()` viene chiamato su uno scope di questo tipo, le coroutine **non** diventano zombie ma ricevono invece un segnale di cancellazione. Questo e' utile per i task in background che non richiedono il completamento garantito.

Il metodo restituisce lo stesso oggetto scope, abilitando il concatenamento dei metodi (interfaccia fluente).

## Valore di ritorno

`Scope` — lo stesso oggetto scope (per il concatenamento dei metodi).

## Esempi

### Esempio #1 Scope per task in background

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Task in background: pulizia della cache
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// Con disposeSafely(), le coroutine verranno cancellate invece di diventare zombie
$scope->disposeSafely();
```

### Esempio #2 Utilizzo con inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Processo in background\n";
    \Async\delay(10_000);
});

// Alla chiusura: le coroutine verranno cancellate, non trasformate in zombie
$bgScope->disposeSafely();
```

## Vedi anche

- [Scope::disposeSafely](/it/docs/reference/scope/dispose-safely.html) — Chiudi lo scope in modo sicuro
- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Chiudi lo scope forzatamente
- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella tutte le coroutine
