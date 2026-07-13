---
layout: tutorial
lang: it
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /it/tutors/06-future.html
page_title: "Future"
description: "Future e FutureState: la promessa di un risultato che non è legato a una coroutine."
---

# Future

Nei capitoli precedenti abbiamo scoperto che una coroutine si comporta come la promessa di un risultato:
`await` può essere chiamato quante volte vuoi, e restituisce sempre la stessa cosa.
Ma una coroutine ha un vincolo rigido: il risultato è sempre prodotto dalla funzione
che `spawn` ha avviato. Una chiamata, una funzione, un risultato.

Ma cosa succede se il risultato non proviene affatto da una funzione?

Torniamo a `ProfileService`. Un utente cambia il proprio indirizzo di consegna e, prima
di salvarlo, l'indirizzo deve essere verificato rispetto a un elenco di regioni servite
dal servizio `GeoDirectory`:

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

L'elenco è grande, lento da caricare e uguale per tutti. Allo stesso tempo,
ogni richiesta di aggiornamento del profilo ne ha bisogno, e le richieste vengono gestite
in modo concorrente. Chiamare `spawn(loadRegions(...))` in ognuna significa bombardare
`GeoDirectory` con richieste identiche per ottenere una risposta identica. Uno spreco.

Quello che vorremmo è che la prima richiesta carichi davvero l'elenco, mentre tutte
le altre attendono il suo risultato. Per questo ci serve un posto in cui un pezzo di codice
deposita il risultato e un altro lo raccoglie.

Quel posto può essere un `Future`.

## FutureState e Future

`Future` è una promessa e un contenitore per un risultato. Non è legato a una coroutine,
ma funziona con l'`await` che già conosciamo.

`Future` è composto da due oggetti:

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — scrive il risultato. Resta con chi produce il risultato.
- **`Future`** — legge il risultato. Viene consegnato a chi attende il risultato.

Il produttore completa l'operazione, il consumatore la attende tramite il familiare `await`:

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

Perché due oggetti invece di uno? La separazione protegge dagli errori.
Chi possiede un `Future` fisicamente non può completare l'operazione: non esiste un tale
metodo su di esso. Solo il proprietario del `FutureState` può scrivere il risultato,
e una sola volta:

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

Se l'operazione fallisce, al posto di un risultato viene scritta un'eccezione,
e `await` la lancerà per tutti quelli che stanno aspettando:

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## Risolvere il problema dell'elenco

Ora possiamo costruire un caricamento dell'elenco che le richieste concorrenti condividono tra loro:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

La prima chiamata a `regions` avvia una coroutine che esegue il caricamento vero e proprio.
Ogni chiamata successiva ottiene lo stesso `Future` e attende un unico risultato condiviso.
Una volta caricato l'elenco, `await` inizia a restituirlo istantaneamente, non importa
quante volte venga richiesto:

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

Per quante richieste vengano gestite in modo concorrente, `GeoDirectory` viene interpellato esattamente una volta,
mentre `RegionsDirectory` resta un servizio ordinario: può essere collegato in un container DI,
sostituito nei test, e tutto il suo stato vive in un singolo campo `$future`.
Nota che `await` funziona allo stesso modo con una coroutine e con un `Future`,
incluso il timeout del capitolo precedente:

```php
$regions = await($directory->regions(), timeout(2000));
```

## Un risultato che hai già

A volte il risultato è noto in anticipo. Per esempio, l'elenco delle regioni
viene precaricato all'avvio del servizio ed è già presente in memoria. Non ha
senso creare un `FutureState` e una coroutine solo per un valore già noto,
quindi esistono metodi factory per questo:

```php
// il risultato è già disponibile
$future = Future::completed($regionsFromWarmup);

// l'errore è già noto
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

Il metodo `regions` può restituire un tale `Future`, e il consumatore non noterà
la differenza: chiama comunque `await` e ottiene il risultato immediatamente.

## Una tecnica classica: la memoizzazione

`RegionsDirectory` implementa già una tecnica classica chiamata memoizzazione:
calcola il risultato una volta e lo consegna a ogni chiamata ripetuta. La tecnica
è abbastanza generale da poter essere avvolta attorno a qualsiasi funzione con argomenti:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // una richiesta a GeoDirectory
$fr = await($regionsOf('FR')); // una richiesta a GeoDirectory
$de = await($regionsOf('DE')); // istantaneo, dalla cache
```

Nota una sottigliezza: la cache contiene il `Future` stesso, non un semplice valore.
Una memoizzazione ingenua in codice concorrente soffrirebbe di una corsa critica: mentre la prima
chiamata attende la risposta di `GeoDirectory`, una seconda chiamata controlla la cache, la vede
vuota e lancia una richiesta duplicata. Qui non c'è un tale intervallo. Il `Future`
finisce nella cache immediatamente, prima ancora che il calcolo inizi, così la seconda
chiamata lo trova e semplicemente attende.

La tecnica ha un limite: la memoizzazione funziona solo per dati che non cambiano
per tutta la vita del processo. Mettere in cache in questo modo la verifica di un token o un tasso di cambio
sarebbe un errore: dipendono dal tempo, e una tale cache ha bisogno di una durata dopo
la quale il risultato viene recuperato di nuovo. Per la stessa ragione, gli errori meritano una riflessione
a parte: anche un `Future` fallito resterebbe nella cache per sempre, ed è di solito
meglio rimuoverlo così che la chiamata successiva riprovi.

La cosa principale da portare via da questo capitolo: una coroutine risponde alla domanda
"come ottengo il risultato", mentre un `Future` semplicemente promette che un risultato
esisterà. Da dove provenga, da una coroutine, da una cache o da un altro thread, non sono
affari del consumatore. Il produttore e il consumatore si sono accordati su un
risultato e non sanno nient'altro l'uno dell'altro.

Ma cosa succede se non c'è un solo risultato, ma un intero flusso di valori che
devono viaggiare da coroutine a coroutine? Per questo esiste uno strumento a parte,
ed è l'argomento del prossimo capitolo.
