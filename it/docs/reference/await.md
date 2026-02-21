---
layout: docs
lang: it
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /it/docs/reference/await.html
page_title: "await()"
description: "await() — attesa del completamento di una coroutine o Future. Documentazione completa: parametri, eccezioni, esempi."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Attende il completamento di una coroutine, `Async\Future` o qualsiasi altro `Async\Completable`.
Restituisce il risultato o lancia un'eccezione.

## Descrizione

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Sospende l'esecuzione della coroutine corrente fino al completamento dell'`Async\Completable` `$awaitable` specificato (o fino all'attivazione di `$cancellation`, se fornito) e restituisce il risultato.
Se l'`awaitable` è già completato, il risultato viene restituito immediatamente.

Se la coroutine è terminata con un'eccezione, questa verrà propagata al codice chiamante.

## Parametri

**`awaitable`**
Un oggetto che implementa l'interfaccia `Async\Completable` (estende `Async\Awaitable`). Tipicamente questo è:
- `Async\Coroutine` - il risultato della chiamata a `spawn()`
- `Async\TaskGroup` - un gruppo di task
- `Async\Future` - un valore futuro

**`cancellation`**
Un oggetto opzionale `Async\Completable`; quando si completa, l'attesa verrà annullata.

## Valori di ritorno

Restituisce il valore restituito dalla coroutine. Il tipo di ritorno dipende dalla coroutine.

## Errori/Eccezioni

Se la coroutine è terminata con un'eccezione, `await()` rilancerà quella eccezione.

Se la coroutine è stata annullata, verrà lanciata `Async\AsyncCancellation`.

## Esempi

### Esempio #1 Uso base di await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Ciao, Async!";
});

echo await($coroutine); // Ciao, Async!
?>
```

### Esempio #2 Attesa sequenziale

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "Utente: {$user['name']}\n";
echo "Post: " . count($posts) . "\n";
?>
```

### Esempio #3 Gestione delle eccezioni

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Impossibile recuperare i dati");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Dati ricevuti\n";
} catch (RuntimeException $e) {
    echo "Errore: " . $e->getMessage() . "\n";
}
?>
```

### Esempio #4 await con TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Risultato 1";
});

$taskGroup->spawn(function() {
    return "Risultato 2";
});

$taskGroup->spawn(function() {
    return "Risultato 3";
});

// Ottieni un array di tutti i risultati
$results = await($taskGroup);
print_r($results); // Array di risultati
?>
```

### Esempio #5 Await multipli sulla stessa coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Fatto";
});

// Il primo await attenderà il risultato
$result1 = await($coroutine);
echo "$result1\n";

// Gli await successivi restituiscono il risultato istantaneamente
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Esempio #6 await all'interno di una coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Coroutine genitore avviata\n";

    $child = spawn(function() {
        echo "Coroutine figlia in esecuzione\n";
        Async\sleep(1000);
        return "Risultato dalla figlia";
    });

    echo "In attesa della figlia...\n";
    $result = await($child);
    echo "Ricevuto: $result\n";
});

echo "Il codice principale continua\n";
?>
```

## Changelog

| Versione | Descrizione                      |
|----------|----------------------------------|
| 1.0.0    | Aggiunta la funzione `await()`  |

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) - Avvio di una coroutine
- [suspend()](/it/docs/reference/suspend.html) - Sospensione dell'esecuzione
