---
layout: docs
lang: it
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /it/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — attendi i primi N task completati con successo."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Attende i **primi N** task completati con successo. Se uno dei primi N fallisce, lancia un'eccezione.

## Descrizione

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parametri

**`count`**
Il numero di risultati riusciti da attendere. Se `0`, restituisce un array vuoto.

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable`.

**`cancellation`**
Un Awaitable opzionale per annullare l'attesa.

**`preserveKeyOrder`**
Se `true`, le chiavi dei risultati corrispondono alle chiavi dell'array di input. Se `false`, nell'ordine di completamento.

## Valori di ritorno

Un array di `$count` risultati riusciti.

## Errori/Eccezioni

Se un task fallisce prima di raggiungere `$count` successi, l'eccezione viene lanciata.

## Esempi

### Esempio #1 Ottenere 2 risultati su 5

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Attendi qualsiasi 2 risposte riuscite
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Note

> **Nota:** Il parametro `triggers` accetta qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Vedi l'[esempio con Iterator](/it/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Vedi anche

- [await_any_of()](/it/docs/reference/await-any-of.html) — primi N con tolleranza agli errori
- [await_all_or_fail()](/it/docs/reference/await-all-or-fail.html) — tutti i task
