---
layout: docs
lang: it
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /it/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Cerca un valore solo nel contesto locale (senza cercare nei contesti genitori)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Cerca un valore per chiave **solo** nel contesto corrente (locale). A differenza di `find()`,
questo metodo non risale la gerarchia dei contesti genitori.

Restituisce `null` se la chiave non viene trovata al livello corrente.

## Parametri

**key**
: La chiave da cercare. Puo' essere una stringa o un oggetto.

## Valore di ritorno

Il valore associato alla chiave nel contesto locale, oppure `null` se la chiave non viene trovata.

## Esempi

### Esempio #1 Differenza tra find e findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() risale la gerarchia
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() cerca solo al livello corrente
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Esempio #2 Utilizzo con chiave oggetto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // La chiave oggetto del genitore non e' visibile tramite findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Esempio #3 Sovrascrittura di un valore del genitore

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Verifica se il valore e' sovrascritto localmente
    if (current_context()->findLocal('timeout') === null) {
        // Usa il valore ereditato, ma puo' sovrascriverlo
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## Vedi anche

- [Context::find](/it/docs/reference/context/find.html) --- Ricerca con attraversamento gerarchico
- [Context::getLocal](/it/docs/reference/context/get-local.html) --- Ottieni il valore locale (lancia eccezione)
- [Context::hasLocal](/it/docs/reference/context/has-local.html) --- Verifica la chiave nel contesto locale
