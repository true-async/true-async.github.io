---
layout: docs
lang: it
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /it/docs/reference/context/find.html
page_title: "Context::find"
description: "Cerca un valore per chiave nel contesto corrente o genitore."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Cerca un valore per chiave nel contesto corrente. Se la chiave non viene trovata, la ricerca continua
risalendo la gerarchia dei contesti genitori. Restituisce `null` se il valore non viene trovato a nessun livello.

Questo e' un metodo di ricerca sicuro: non lancia mai un'eccezione quando una chiave e' assente.

## Parametri

**key**
: La chiave da cercare. Puo' essere una stringa o un oggetto.
  Quando si utilizza un oggetto come chiave, la ricerca viene eseguita per riferimento all'oggetto.

## Valore di ritorno

Il valore associato alla chiave, oppure `null` se la chiave non viene trovata nel contesto
corrente o in nessun contesto genitore.

## Esempi

### Esempio #1 Ricerca di un valore per chiave stringa

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // La coroutine figlia trova il valore dal contesto genitore
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // La ricerca di una chiave inesistente restituisce null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Esempio #2 Ricerca di un valore per chiave oggetto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Ricerca per riferimento alla chiave oggetto
    $logger = current_context()->find($loggerKey);
    $logger->info('Messaggio dalla coroutine figlia');
});
```

### Esempio #3 Ricerca gerarchica

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Livello radice
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Livello 1: aggiunge il proprio valore
    current_context()->set('user_id', 42);

    spawn(function() {
        // Livello 2: cerca valori da tutti i livelli
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## Vedi anche

- [Context::get](/it/docs/reference/context/get.html) --- Ottieni il valore (lancia eccezione se assente)
- [Context::has](/it/docs/reference/context/has.html) --- Verifica se la chiave esiste
- [Context::findLocal](/it/docs/reference/context/find-local.html) --- Cerca solo nel contesto locale
- [Context::set](/it/docs/reference/context/set.html) --- Imposta un valore nel contesto
