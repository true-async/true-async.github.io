---
layout: docs
lang: it
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /it/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — attendi i primi N task con tolleranza per fallimenti parziali."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Attende i **primi N** task completati, raccogliendo risultati ed errori separatamente. Non lancia un'eccezione quando singoli task falliscono.

## Descrizione

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parametri

**`count`**
Il numero di risultati riusciti da attendere.

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable`.

**`cancellation`**
Un Awaitable opzionale per annullare l'attesa.

**`preserveKeyOrder`**
Se `true`, le chiavi dei risultati corrispondono alle chiavi dell'array di input.

**`fillNull`**
Se `true`, `null` viene inserito nell'array dei risultati per i task falliti.

## Valori di ritorno

Un array di due elementi: `[$results, $errors]`

- `$results` — array dei risultati riusciti (fino a `$count` elementi)
- `$errors` — array delle eccezioni dai task falliti

## Esempi

### Esempio #1 Quorum con tolleranza agli errori

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Attendi il quorum: 3 risposte su 5
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quorum raggiunto\n";
} else {
    echo "Quorum non raggiunto, errori: " . count($errors) . "\n";
}
?>
```

## Note

> **Nota:** Il parametro `triggers` accetta qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Vedi l'[esempio con Iterator](/it/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Vedi anche

- [await_any_of_or_fail()](/it/docs/reference/await-any-of-or-fail.html) — primi N, errore interrompe
- [await_all()](/it/docs/reference/await-all.html) — tutti i task con tolleranza agli errori
