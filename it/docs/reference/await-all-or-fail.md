---
layout: docs
lang: it
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /it/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — attendi il completamento di tutti i task; lancia un'eccezione al primo errore."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Attende il completamento con successo di **tutti** i task. Al primo errore, lancia un'eccezione e annulla i task rimanenti.

## Descrizione

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parametri

**`triggers`**
Una collezione iterabile di oggetti `Async\Completable` (coroutine, Future, ecc.).

**`cancellation`**
Un Awaitable opzionale per annullare l'intera attesa (es. `timeout()`).

**`preserveKeyOrder`**
Se `true` (predefinito), i risultati vengono restituiti nell'ordine delle chiavi dell'array di input. Se `false`, nell'ordine di completamento.

## Valori di ritorno

Un array di risultati da tutti i task. Le chiavi corrispondono alle chiavi dell'array di input.

## Errori/Eccezioni

Lancia l'eccezione del primo task che ha fallito.

## Esempi

### Esempio #1 Caricamento dati in parallelo

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Esempio #2 Con timeout

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Non tutti i task sono stati completati entro 5 secondi\n";
}
?>
```

### Esempio #3 Con Iterator invece di array

Tutte le funzioni della famiglia `await_*` accettano non solo array ma qualsiasi `iterable`, incluse le implementazioni di `Iterator`. Questo consente di generare coroutine dinamicamente:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## Vedi anche

- [await_all()](/it/docs/reference/await-all.html) — tutti i task con tolleranza agli errori
- [await()](/it/docs/reference/await.html) — attesa di un singolo task
