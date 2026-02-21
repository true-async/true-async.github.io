---
layout: docs
lang: it
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /it/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Rimuove un valore per chiave dal contesto."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Rimuove un valore per chiave dal contesto corrente. La rimozione riguarda solo il contesto
locale --- i valori nei contesti genitori non vengono modificati.

Il metodo restituisce l'oggetto `Context`, consentendo il concatenamento dei metodi.

## Parametri

**key**
: La chiave da rimuovere. Puo' essere una stringa o un oggetto.

## Valore di ritorno

L'oggetto `Context` per il concatenamento dei metodi.

## Esempi

### Esempio #1 Rimozione di un valore dal contesto

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Rimuovi i dati temporanei
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Esempio #2 Rimozione con chiave oggetto

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Rimuovi i dati sensibili dopo l'uso
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Esempio #3 La rimozione non influenza il contesto genitore

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Il contesto figlio vede il valore dal genitore
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Imposta un valore locale con la stessa chiave
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Rimuovi il valore locale
    current_context()->unset('shared');

    // Dopo la rimozione del valore locale — il valore del genitore e' di nuovo visibile tramite find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Esempio #4 Concatenamento dei metodi con unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Rimuovi piu' chiavi con il concatenamento
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## Vedi anche

- [Context::set](/it/docs/reference/context/set.html) --- Imposta un valore nel contesto
- [Context::find](/it/docs/reference/context/find.html) --- Cerca il valore per chiave
- [Context::findLocal](/it/docs/reference/context/find-local.html) --- Cerca il valore nel contesto locale
