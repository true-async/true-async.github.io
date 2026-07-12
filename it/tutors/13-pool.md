---
layout: tutorial
lang: it
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /it/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool: un pool di risorse universale con health check e un circuit breaker."
---

# Pool

Nel capitolo su PDO Pool abbiamo abbozzato un pool basato su canale in sei righe e abbiamo subito
ammesso che era ingenuo per la vita reale: devi ricordarti di restituire la risorsa comunque vadano
le cose, riconoscere le connessioni rotte e sostituire quelle morte. Per PDO, il core faceva tutto
questo al posto nostro. Ma `checkAddress` parla con `GeoDirectory` via HTTP, e aprire una nuova
connessione a esso a ogni richiesta sarebbe altrettanto uno spreco. E domani ci saranno Redis per
la cache e SMTP per l'email.

Di certo non costruiremo a mano un pool su canale per ogni singola risorsa. Giusto, esiste una
primitiva già pronta per questo, proprio quella che lavora sotto il cofano di PDO Pool:
`Async\Pool`.

## Factory e destructor

Il pool non sa che tipo di risorsa sta tenendo. Gli dici due cose: come creare una risorsa e come
distruggerne una:

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` significa che due connessioni vengono aperte in anticipo, così le prime coroutine non
devono aspettare l'handshake. `max: 10` significa che il pool non creerà mai più di dieci
connessioni, per quante coroutine ne chiedano una. È il familiare limite di concorrenza, solo che
ora è legato alla risorsa stessa invece che a un numero di worker.

Poi arriva il ciclo che abbiamo già costruito a mano con un canale:

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` consegna una risorsa libera. Se nessuna è libera e il limite non è stato raggiunto, la
factory ne crea una nuova. Se il limite è stato raggiunto, la coroutine va a dormire finché
qualcun altro non chiama `release`: la stessa meccanica di `recv` su un canale vuoto. Nota il
`finally`: la risorsa viene restituita comunque vadano le cose, inclusa un'eccezione o un
annullamento. È esattamente il punto in cui il nostro pool fatto a mano inciampava.

Puoi anche aspettare con un limite, nel modo consueto:

```php
$conn = $geo->acquire(timeout: 3000); // TimeoutException se non arriva entro 3 secondi
```

## Le risorse muoiono

Una connessione rimasta nel pool per mezz'ora può essere morta silenziosamente: il server l'ha
chiusa dopo un timeout, la rete ha avuto un intoppo. Abbiamo già visto nel capitolo su PDO a cosa
porta questo: la coroutine successiva riceve un errore misterioso dal nulla. Il pool combatte
questo su tre fronti:

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — ogni trenta secondi il pool percorre da solo le sue risorse libere e ne
  controlla il polso. Quelle morte vengono distrutte e sostituite con nuove.
- **`beforeAcquire`** — un controllo finale prima di consegnare una risorsa. Se fallisce, la
  risorsa viene distrutta e la coroutine riceve la successiva.
- **`beforeRelease`** — un controllo alla restituzione. Una coroutine può aver rotto la
  connessione a metà di una richiesta; una risorsa così non torna nel pool.

Le coroutine non sanno nulla di questo lavoro dietro le quinte: chiedono una risorsa e ne
ricevono una funzionante. La gestione dello stato di salute è espressa in modo dichiarativo, nel
costruttore, invece di essere spalmata nel codice come un mucchio di `if`.

## Circuit breaker

Ora immagina che `GeoDirectory` cada del tutto. Tutte e dieci le connessioni sono morte, ogni
coroutine aspetta diligentemente un timeout, crea una nuova connessione, aspetta di nuovo.
L'applicazione spende tutte le sue energie a bombardare un servizio che è già a terra, e così
facendo gli impedisce di rialzarsi.

L'ingegneria elettrica ha inventato una soluzione proprio per questo: un interruttore automatico
che apre il circuito finché il guasto non viene risolto. Il pattern prende il nome da esso,
circuit breaker, ed è integrato nel pool. Il pool ha tre stati: `ACTIVE`, tutto funziona;
`INACTIVE`, il servizio è stato dichiarato non disponibile e `acquire` fallisce immediatamente,
senza alcun timeout; `RECOVERING`, un controllo cauto su se il servizio sia tornato in vita.

Puoi cambiare stato a mano, oppure affidare la decisione a una strategia:

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // tenta il recupero alla prima occasione
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

Il pool stesso riporta alla strategia ogni successo e ogni fallimento di una risorsa, e chiede
attraverso `shouldRecover` se è ora di controllare con cautela se il servizio è tornato. Cinque
fallimenti di fila, e il circuito si apre: le coroutine ottengono un fallimento veloce invece di
una lenta tortura di timeout, e `GeoDirectory` smette di prendere colpi inutili e può riprendersi
in pace.

Guardando indietro, `Pool` fa esattamente ciò che abbiamo costruito a mano da un canale nel
capitolo nove, più tutto ciò che davvero non vuoi costruire a mano: restituzione garantita, health
check, un circuit breaker. `PDO Pool` è la stessa primitiva, solo nascosta dietro la facciata di
`PDO`. E per tutto il resto, client HTTP, Redis, socket e oggetti pesanti in generale, c'è
`Async\Pool`.

A questo punto il nostro arsenale sembra impressionante: coroutine, canali, scope, task group,
pool. Ma tutto questo gira in un singolo thread del sistema operativo e condivide un singolo core
della CPU. Finché i task sono in attesa su I/O, non è un problema per nessuno. Ma cosa succede se
il lavoro non è vincolato dall'attesa ma dal calcolo? Lì l'intero quadro cambia, ed è di questo che
parla il prossimo capitolo.
