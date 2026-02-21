---
layout: docs
lang: it
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /it/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Verifica se una chiave esiste solo nel contesto locale."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Verifica se un valore con la chiave specificata esiste **solo** nel contesto corrente (locale).
A differenza di `has()`, questo metodo non cerca nei contesti genitori.

## Parametri

**key**
: La chiave da verificare. Puo' essere una stringa o un oggetto.

## Valore di ritorno

`true` se la chiave viene trovata nel contesto locale, `false` altrimenti.

## Esempi

### Esempio #1 Differenza tra has e hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() risale la gerarchia
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() verifica solo il livello corrente
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Esempio #2 Verifica con chiave oggetto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Esempio #3 Inizializzazione condizionale di un valore locale

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Inizializza il valore solo se non impostato localmente
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## Vedi anche

- [Context::has](/it/docs/reference/context/has.html) --- Verifica con attraversamento gerarchico
- [Context::findLocal](/it/docs/reference/context/find-local.html) --- Cerca il valore nel contesto locale
- [Context::getLocal](/it/docs/reference/context/get-local.html) --- Ottieni il valore locale (lancia eccezione)
