---
layout: docs
lang: it
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /it/docs/reference/context/has.html
page_title: "Context::has"
description: "Verifica se una chiave esiste nel contesto corrente o genitore."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Verifica se un valore con la chiave specificata esiste nel contesto corrente o in uno
dei contesti genitori. La ricerca viene eseguita risalendo la gerarchia.

## Parametri

**key**
: La chiave da verificare. Puo' essere una stringa o un oggetto.

## Valore di ritorno

`true` se la chiave viene trovata nel contesto corrente o in un contesto genitore, `false` altrimenti.

## Esempi

### Esempio #1 Verifica di una chiave prima dell'uso

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale non impostato, uso quello predefinito\n";
    }
});
```

### Esempio #2 Verifica con chiave oggetto

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Cache disponibile\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Esempio #3 Verifica gerarchica

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (dalla radice)
        var_dump(current_context()->has('local_flag'));   // true (dal genitore)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## Vedi anche

- [Context::find](/it/docs/reference/context/find.html) --- Cerca il valore per chiave
- [Context::get](/it/docs/reference/context/get.html) --- Ottieni il valore (lancia eccezione)
- [Context::hasLocal](/it/docs/reference/context/has-local.html) --- Verifica solo nel contesto locale
