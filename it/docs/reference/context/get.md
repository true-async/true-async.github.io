---
layout: docs
lang: it
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /it/docs/reference/context/get.html
page_title: "Context::get"
description: "Ottiene un valore dal contesto. Lancia un'eccezione se la chiave non viene trovata."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Ottiene un valore per chiave dal contesto corrente. Se la chiave non viene trovata al livello corrente,
la ricerca continua risalendo la gerarchia dei contesti genitori.

A differenza di `find()`, questo metodo lancia un'eccezione se la chiave non viene trovata a nessun livello.
Usa `get()` quando la presenza di un valore e' un requisito obbligatorio.

## Parametri

**key**
: La chiave da cercare. Puo' essere una stringa o un oggetto.
  Quando si utilizza un oggetto come chiave, la ricerca viene eseguita per riferimento all'oggetto.

## Valore di ritorno

Il valore associato alla chiave.

## Errori

- Lancia `Async\ContextException` se la chiave non viene trovata nel contesto
  corrente o in nessun contesto genitore.

## Esempi

### Esempio #1 Ottenere un valore obbligatorio

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Ottieni un valore che deve esistere
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Esempio #2 Gestione di una chiave mancante

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Chiave non trovata: " . $e->getMessage() . "\n";
}
```

### Esempio #3 Utilizzo di una chiave oggetto

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // La chiave oggetto garantisce l'unicita' senza conflitti di nome
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## Vedi anche

- [Context::find](/it/docs/reference/context/find.html) --- Ricerca sicura (restituisce null)
- [Context::has](/it/docs/reference/context/has.html) --- Verifica se la chiave esiste
- [Context::getLocal](/it/docs/reference/context/get-local.html) --- Ottieni il valore solo dal contesto locale
- [Context::set](/it/docs/reference/context/set.html) --- Imposta un valore nel contesto
