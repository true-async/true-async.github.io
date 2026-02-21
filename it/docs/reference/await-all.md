---
layout: docs
lang: it
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /it/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — attendi tutti i task con tolleranza per fallimenti parziali."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Attende il completamento di **tutti** i task, raccogliendo risultati ed errori separatamente. Non lancia un'eccezione quando singoli task falliscono.

## Descrizione

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parametri

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable`.

**`cancellation`**
Un Awaitable opzionale per annullare l'intera attesa.

**`preserveKeyOrder`**
Se `true` (predefinito), i risultati sono nell'ordine delle chiavi dell'array di input. Se `false`, nell'ordine di completamento.

**`fillNull`**
Se `true`, `null` viene inserito nell'array dei risultati per i task falliti. Se `false` (predefinito), le chiavi con errori vengono omesse.

## Valori di ritorno

Un array di due elementi: `[$results, $errors]`

- `$results` — array dei risultati riusciti
- `$errors` — array delle eccezioni (le chiavi corrispondono alle chiavi dei task di input)

## Esempi

### Esempio #1 Tolleranza ai fallimenti parziali

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Errore'); }),
];

[$results, $errors] = await_all($coroutines);

// $results contiene 'fast' e 'slow'
// $errors contiene 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Task '$key' fallito: {$error->getMessage()}\n";
}
?>
```

### Esempio #2 Con fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (invece di una chiave mancante)
?>
```

## Note

> **Nota:** Il parametro `triggers` accetta qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Le coroutine possono essere create dinamicamente durante l'iterazione. Vedi l'[esempio con Iterator](/it/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Vedi anche

- [await_all_or_fail()](/it/docs/reference/await-all-or-fail.html) — tutti i task, errore interrompe
- [await_any_or_fail()](/it/docs/reference/await-any-or-fail.html) — primo risultato
