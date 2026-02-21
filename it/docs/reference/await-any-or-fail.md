---
layout: docs
lang: it
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /it/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — attendi il primo task completato."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Attende il **primo** task completato. Se il primo task completato ha lanciato un'eccezione, questa viene propagata.

## Descrizione

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Parametri

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable`.

**`cancellation`**
Un Awaitable opzionale per annullare l'attesa.

## Valori di ritorno

Il risultato del primo task completato.

## Errori/Eccezioni

Se il primo task completato ha lanciato un'eccezione, questa verrà propagata.

## Esempi

### Esempio #1 Gara di richieste

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Vince chi risponde per primo
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Risposta ricevuta dal mirror più veloce\n";
?>
```

## Note

> **Nota:** Il parametro `triggers` accetta qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Vedi l'[esempio con Iterator](/it/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Vedi anche

- [await_first_success()](/it/docs/reference/await-first-success.html) — primo successo, ignorando gli errori
- [await_all_or_fail()](/it/docs/reference/await-all-or-fail.html) — tutti i task
