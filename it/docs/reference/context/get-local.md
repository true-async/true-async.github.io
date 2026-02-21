---
layout: docs
lang: it
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /it/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Ottiene un valore solo dal contesto locale. Lancia un'eccezione se non trovato."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Ottiene un valore per chiave **solo** dal contesto corrente (locale).
A differenza di `get()`, questo metodo non cerca nei contesti genitori.

Se la chiave non viene trovata al livello corrente, lancia un'eccezione.

## Parametri

**key**
: La chiave da cercare. Puo' essere una stringa o un oggetto.

## Valore di ritorno

Il valore associato alla chiave nel contesto locale.

## Errori

- Lancia `Async\ContextException` se la chiave non viene trovata nel contesto locale.

## Esempi

### Esempio #1 Ottenere un valore locale

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Il valore e' impostato localmente — getLocal funziona
    $taskId = current_context()->getLocal('task_id');
    echo "Task: {$taskId}\n"; // "Task: 42"
});
```

### Esempio #2 Eccezione quando si accede a una chiave ereditata

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() troverebbe il valore nel genitore
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() lancia un'eccezione — il valore non e' nel contesto locale
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Non trovato localmente: " . $e->getMessage() . "\n";
    }
});
```

### Esempio #3 Utilizzo con chiave oggetto

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "Utente: " . $session['user'] . "\n"; // "Utente: admin"
});
```

## Vedi anche

- [Context::get](/it/docs/reference/context/get.html) --- Ottieni il valore con ricerca gerarchica
- [Context::findLocal](/it/docs/reference/context/find-local.html) --- Ricerca sicura nel contesto locale
- [Context::hasLocal](/it/docs/reference/context/has-local.html) --- Verifica la chiave nel contesto locale
