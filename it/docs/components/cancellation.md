---
layout: docs
lang: it
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /it/docs/components/cancellation.html
page_title: "Cancellazione"
description: "Cancellazione delle coroutine in TrueAsync -- cancellazione cooperativa, sezioni critiche con protect(), cancellazione a cascata tramite Scope, timeout."
---

# Cancellazione

Un browser ha inviato una richiesta, ma poi l'utente ha chiuso la pagina.
Il server continua a lavorare su una richiesta che non serve più.
Sarebbe utile interrompere l'operazione per evitare costi inutili.
Oppure supponiamo che ci sia un lungo processo di copia dati che deve essere improvvisamente cancellato.
Ci sono molti scenari in cui è necessario interrompere le operazioni.
Di solito questo problema viene risolto con variabili flag o token di cancellazione, il che è piuttosto laborioso. Il codice deve sapere
che potrebbe essere cancellato, deve pianificare i punti di controllo della cancellazione e gestire correttamente queste situazioni.

## Cancellabile per Design

La maggior parte del tempo, un'applicazione è impegnata a leggere dati
da database, file o dalla rete. Interrompere una lettura è sicuro.
Pertanto, in `TrueAsync` si applica il seguente principio: **una coroutine può essere cancellata in qualsiasi momento dallo stato di attesa**.
Questo approccio riduce la quantità di codice, poiché nella maggior parte dei casi il programmatore non deve preoccuparsi
della cancellazione.

## Come Funziona la Cancellazione

Un'eccezione speciale -- `Cancellation` -- viene utilizzata per cancellare una coroutine.
L'eccezione `Cancellation` o una derivata viene lanciata in un punto di sospensione (`suspend()`, `await()`, `delay()`).
L'esecuzione può anche essere interrotta durante operazioni di I/O o qualsiasi altra operazione bloccante.

```php
$coroutine = spawn(function() {
    echo "Inizio lavoro\n";
    suspend(); // Qui la coroutine riceverà Cancellation
    echo "Questo non accadrà\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancellata\n";
    throw $e;
}
```

## La Cancellazione Non Può Essere Soppressa

`Cancellation` è un'eccezione di livello base, alla pari con `Error` ed `Exception`.
Il costrutto `catch (Exception $e)` non la intercetterà.

Catturare `Cancellation` e continuare a lavorare è un errore.
Puoi usare `catch Async\AsyncCancellation` per gestire situazioni speciali,
ma devi assicurarti di rilanciare correttamente l'eccezione.
In generale, si raccomanda di usare `finally` per la pulizia garantita delle risorse:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Tre Scenari di Cancellazione

Il comportamento di `cancel()` dipende dallo stato della coroutine:

**La coroutine non è ancora stata avviata** -- non verrà mai avviata.

```php
$coroutine = spawn(function() {
    echo "Non verrà eseguito\n";
});
$coroutine->cancel();
```

**La coroutine è in stato di attesa** -- si risveglierà con un'eccezione `Cancellation`.

```php
$coroutine = spawn(function() {
    echo "Lavoro iniziato\n";
    suspend(); // Qui riceverà Cancellation
    echo "Non verrà eseguito\n";
});

suspend();
$coroutine->cancel();
```

**La coroutine è già terminata** -- non succede nulla.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Non è un errore, ma non ha effetto
```

## Sezioni Critiche: protect()

Non ogni operazione può essere interrotta in sicurezza.
Se una coroutine ha addebitato denaro da un conto ma non ha ancora accreditato un altro --
la cancellazione in questo punto porterebbe alla perdita di dati.

La funzione `protect()` posticipa la cancellazione fino al completamento della sezione critica:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // La cancellazione avrà effetto qui -- dopo l'uscita da protect()
});

suspend();
$coroutine->cancel();
```

All'interno di `protect()`, la coroutine è marcata come protetta.
Se `cancel()` arriva in questo momento, la cancellazione viene salvata
ma non applicata. Non appena `protect()` termina --
la cancellazione posticipata ha effetto immediatamente.

## Cancellazione a Cascata tramite Scope

Quando uno `Scope` viene cancellato, tutte le sue coroutine e tutti gli scope figli vengono cancellati.
La cascata va **solo dall'alto verso il basso** -- cancellare uno scope figlio non influenza lo scope genitore o gli scope fratelli.

### Isolamento: Cancellare un Figlio Non Influenza gli Altri

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Cancella solo child1
$child1->cancel();

$parent->isCancelled(); // false -- il genitore non è influenzato
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- lo scope fratello non è influenzato
```

### Cascata Discendente: Cancellare un Genitore Cancella Tutti i Discendenti

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Cascata: cancella sia child1 che child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Una Coroutine Può Cancellare il Proprio Scope

Una coroutine può avviare la cancellazione dello scope in cui viene eseguita. Il codice prima del punto di sospensione più vicino continuerà ad essere eseguito:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Inizio\n";
    $scope->cancel();
    echo "Questo verrà ancora eseguito\n";
    suspend();
    echo "Ma questo no\n";
});
```

Dopo la cancellazione, lo scope è chiuso -- lanciare una nuova coroutine al suo interno non è più possibile.

## Timeout

Un caso speciale di cancellazione è il timeout. La funzione `timeout()` crea un limite di tempo:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "L'API non ha risposto entro 5 secondi\n";
}
```

`TimeoutException` è un sottotipo di `Cancellation`,
quindi la coroutine termina secondo le stesse regole.

## Controllo dello Stato

Una coroutine fornisce due metodi per verificare la cancellazione:

- `isCancellationRequested()` -- la cancellazione è stata richiesta ma non ancora applicata
- `isCancelled()` -- la coroutine si è effettivamente fermata

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- non ancora elaborata

suspend();

$coroutine->isCancelled();             // true
```

## Esempio: Worker di Coda con Arresto Graduale

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // Tutte le coroutine verranno fermate qui
        $this->scope->cancel();
    }
}
```

## Cosa Leggere Dopo?

- [Scope](/it/docs/components/scope.html) -- gestione di gruppi di coroutine
- [Coroutine](/it/docs/components/coroutines.html) -- ciclo di vita delle coroutine
- [Canali](/it/docs/components/channels.html) -- scambio di dati tra coroutine
