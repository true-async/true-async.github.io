---
layout: tutorial
lang: it
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /it/tutors/04-exceptions.html
page_title: "Eccezioni"
description: "Come le eccezioni di una coroutine si propagano attraverso await()."
---

# Eccezioni nelle coroutine

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

La funzione `validateToken` del capitolo precedente ha alcuni problemi.
Se `UserDirectory` non risponde (timeout, rete non disponibile, DNS che non risolve), `file_get_contents` restituisce `false`.
`json_decode(false)` restituisce `null`, e `null->valid` è anch'esso `null`. La funzione restituisce qualcosa di falsy,
lo stesso risultato che si avrebbe con un token effettivamente non valido. `validateToken` non ha modo di distinguere "il token è scaduto"
da "`UserDirectory` non ha risposto", anche se si tratta di due situazioni completamente diverse.

L'approccio corretto è lanciare un'eccezione quando il servizio non risponde:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

Ma cosa succede se viene lanciata un'eccezione all'interno di una coroutine?
Se un'eccezione viene lanciata in normale codice `PHP` e nessuno la cattura, `PHP` termina con un messaggio di Unhandled
Exception. E per una coroutine?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

A prima vista sembra che non ci sia differenza. Ma è tutt'altro che vero.
Le coroutine appartengono al componente `Scheduler`, che è responsabile della commutazione tra di esse. Ogni
coroutine viene eseguita nel proprio flusso logico. Se un'eccezione non gestita raggiunge il gestore finale della coroutine,
viene memorizzata sull'handle della coroutine.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

In altre parole, l'eccezione non terminerà il programma finché qualcuno mantiene ancora un riferimento
a `$coroutine`. Questa logica garantisce l'idempotenza dell'operazione `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Chiamate ripetute ad `await` sulla stessa coroutine producono lo stesso comportamento, indipendentemente dal fatto che la
coroutine sia ancora in esecuzione o meno. Questo ti permette di trattare una coroutine come un `Future`, una promessa di un risultato
che può essere ottenuto in un qualche momento futuro. Se il risultato esiste già, `await` lo restituisce
immediatamente.

Ora possiamo migliorare il codice che valida il token e aggiorna il profilo aggiungendo la gestione delle eccezioni:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Forse vale la pena riprovare l'operazione più tardi?
}
```

> Importante!
> Dopo aver chiamato `await` o qualsiasi altra operazione `await_*`,
> la coroutine viene contrassegnata come gestita, e la sua eccezione non causerà più
> la terminazione del programma PHP.
