---
layout: docs
lang: it
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /it/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — attendi il primo task completato con successo, ignorando gli errori degli altri."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Attende il **primo** task completato **con successo**. Gli errori degli altri task vengono raccolti separatamente e non interrompono l'attesa.

## Descrizione

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Parametri

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable`.

**`cancellation`**
Un Awaitable opzionale per annullare l'attesa.

## Valori di ritorno

Un array di due elementi: `[$result, $errors]`

- `$result` — il risultato del primo task completato con successo (o `null` se tutti i task sono falliti)
- `$errors` — array delle eccezioni dai task falliti prima del primo successo

## Esempi

### Esempio #1 Richiesta fault-tolerant

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Prova più server; prendi la prima risposta riuscita
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Dati ricevuti\n";
} else {
    echo "Tutti i server non disponibili\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Note

> **Nota:** Il parametro `triggers` accetta qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Vedi l'[esempio con Iterator](/it/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Vedi anche

- [await_any_or_fail()](/it/docs/reference/await-any-or-fail.html) — primo task, errore interrompe
- [await_all()](/it/docs/reference/await-all.html) — tutti i task con tolleranza agli errori
