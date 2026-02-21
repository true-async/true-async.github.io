---
layout: docs
lang: it
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /it/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- un pattern di concorrenza strutturata di alto livello per gestire gruppi di task."
---

# La Classe Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Introduzione

Quando si lavora con le coroutine, spesso è necessario lanciare diversi task e attendere i loro risultati.
Usando direttamente `spawn()` e `await()`, lo sviluppatore si assume la responsabilità di garantire
che ogni coroutine venga attesa o cancellata. Una coroutine dimenticata continua a funzionare,
un errore non gestito va perso e la cancellazione di un gruppo di task richiede codice manuale.

Le funzioni `await_all()` e `await_any()` non tengono conto delle relazioni logiche tra task diversi.
Per esempio, quando devi fare diverse richieste, prendere il primo risultato e cancellare il resto,
`await_any()` richiede codice aggiuntivo dal programmatore per cancellare i task rimanenti.
Tale codice può essere piuttosto complesso, quindi `await_all()` e `await_any()` dovrebbero essere considerati
anti-pattern in questa situazione.

Usare `Scope` per questo scopo non è adatto, poiché le coroutine dei task possono creare altre coroutine figlie,
il che richiede al programmatore di mantenere una lista delle coroutine dei task e tracciarle separatamente.

**TaskGroup** risolve tutti questi problemi. È un pattern di concorrenza strutturata di alto livello
che garantisce: tutti i task verranno correttamente attesi o cancellati. Raggruppa logicamente i task
e permette di operare su di essi come un'unità singola.

## Strategie di Attesa

`TaskGroup` fornisce diverse strategie per attendere i risultati.
Ognuna restituisce un `Future`, che permette di passare un timeout: `->await(Async\timeout(5.0))`.

- **`all()`** -- restituisce un `Future` che si risolve con un array di tutti i risultati dei task,
  o viene rifiutato con `CompositeException` se almeno un task ha lanciato un'eccezione.
  Con il parametro `ignoreErrors: true`, restituisce solo i risultati riusciti.
- **`race()`** -- restituisce un `Future` che si risolve con il risultato del primo task completato,
  indipendentemente dal fatto che sia completato con successo o meno. Gli altri task continuano a funzionare.
- **`any()`** -- restituisce un `Future` che si risolve con il risultato del primo task completato *con successo*,
  ignorando gli errori. Se tutti i task falliscono -- viene rifiutato con `CompositeException`.
- **`awaitCompletion()`** -- attende il completamento totale di tutti i task, così come delle altre coroutine nello `Scope`.

## Limite di Concorrenza

Quando viene specificato il parametro `concurrency`, `TaskGroup` funziona come un pool di coroutine:
i task che superano il limite attendono in coda e non creano una coroutine finché non si libera uno slot.
Questo risparmia memoria e controlla il carico durante l'elaborazione di un gran numero di task.

## TaskGroup e Scope

`TaskGroup` usa `Scope` per gestire il ciclo di vita delle coroutine dei task.
Quando si crea un `TaskGroup`, puoi passare uno `Scope` esistente o lasciare che `TaskGroup` crei uno `Scope` figlio da quello corrente.
Tutti i task aggiunti a `TaskGroup` vengono eseguiti all'interno di questo `Scope`.
Questo significa che quando `TaskGroup` viene cancellato o distrutto,
tutte le coroutine verranno automaticamente cancellate, garantendo una gestione sicura delle risorse e prevenendo perdite.

## Sigillatura e Iterazione

`TaskGroup` permette di aggiungere task dinamicamente, finché non viene
sigillato usando il metodo `seal()`.

Il metodo `all()` restituisce un `Future` che si attiva quando tutti i task esistenti
nella coda sono completati. Questo permette di usare `TaskGroup` in un ciclo, dove i task vengono aggiunti dinamicamente,
e `all()` viene chiamato per ottenere i risultati dell'insieme corrente di task.

`TaskGroup` supporta anche `foreach` per iterare sui risultati man mano che diventano pronti.
In questo caso, `seal()` deve essere chiamato dopo aver aggiunto tutti i task per segnalare che
non ci saranno nuovi task, e `foreach` può terminare dopo aver elaborato tutti i risultati.

## Panoramica della Classe

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Metodi */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Aggiunta di task */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Attesa dei risultati */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Ciclo di vita */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Stato */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Risultati ed errori */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Iterazione */
    public getIterator(): Iterator
}
```

## Esempi

### all() -- Caricamento Parallelo dei Dati

Lo scenario più comune -- caricamento di dati da più sorgenti simultaneamente:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Tutte e tre le richieste vengono eseguite in parallelo. Se una di esse lancia un'eccezione,
`all()` restituisce un `Future` che viene rifiutato con `CompositeException`.

### race() -- Richieste Hedged

Il pattern "hedged request" -- invia la stessa richiesta a più repliche
e prendi la prima risposta. Questo riduce la latenza con server lenti o sovraccarichi:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// La prima risposta è il risultato, gli altri task continuano a funzionare
$product = $group->race()->await();
```

### any() -- Ricerca Tollerante agli Errori

Interroga più provider, prendi la prima risposta riuscita, ignorando gli errori:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ignora i provider che hanno fallito e restituisce il primo risultato riuscito
$results = $group->any()->await();

// Gli errori dei provider falliti devono essere gestiti esplicitamente, altrimenti il distruttore lancerà un'eccezione
$group->suppressErrors();
```

Se tutti i provider falliscono, `any()` lancerà `CompositeException` con tutti gli errori.

### Limite di Concorrenza -- Elaborazione di una Coda

Elabora 10.000 task, ma non più di 50 simultaneamente:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` accoda automaticamente i task. Una coroutine viene creata solo quando
si libera uno slot, risparmiando memoria con grandi volumi di task.

### Iterazione sui Risultati Man Mano che si Completano

Elabora i risultati senza attendere il completamento di tutti i task:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // I risultati arrivano man mano che diventano pronti, non nell'ordine in cui sono stati aggiunti
    saveToStorage($result);
}
```

### Timeout per un Gruppo di Task

Limita il tempo di attesa dei risultati:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Non è stato possibile ottenere i dati entro 5 secondi";
}
```

## Analoghi in Altri Linguaggi

| Capacità                | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Concorrenza strutturata | `seal()` + `all()->await()`         | blocco `async with`             | `try-with-resources` + `join()`          | Automaticamente tramite scope |
| Strategie di attesa     | `all()`, `race()`, `any()` -> Future | Solo all (tramite `async with`) | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Limite di concorrenza   | `concurrency: N`                    | No (serve `Semaphore`)          | No                                       | No (serve `Semaphore`)    |
| Iterazione dei risultati | `foreach` man mano che si completano | No                             | No                                       | `Channel`                 |
| Gestione degli errori   | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | L'eccezione cancella lo scope |

PHP `TaskGroup` combina capacità che in altri linguaggi sono distribuite su più primitive:
limitazione della concorrenza senza semaforo, strategie di attesa multiple in un singolo oggetto e iterazione dei risultati man mano che si completano.

## Contenuti

- [TaskGroup::__construct](/it/docs/reference/task-group/construct.html) -- Crea un gruppo di task
- [TaskGroup::spawn](/it/docs/reference/task-group/spawn.html) -- Aggiungi un task con chiave auto-increment
- [TaskGroup::spawnWithKey](/it/docs/reference/task-group/spawn-with-key.html) -- Aggiungi un task con chiave esplicita
- [TaskGroup::all](/it/docs/reference/task-group/all.html) -- Attendi tutti i task e ottieni i risultati
- [TaskGroup::race](/it/docs/reference/task-group/race.html) -- Ottieni il risultato del primo task completato
- [TaskGroup::any](/it/docs/reference/task-group/any.html) -- Ottieni il risultato del primo task riuscito
- [TaskGroup::awaitCompletion](/it/docs/reference/task-group/await-completion.html) -- Attendi il completamento di tutti i task
- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) -- Sigilla il gruppo per nuovi task
- [TaskGroup::cancel](/it/docs/reference/task-group/cancel.html) -- Cancella tutti i task
- [TaskGroup::dispose](/it/docs/reference/task-group/dispose.html) -- Distruggi lo scope del gruppo
- [TaskGroup::finally](/it/docs/reference/task-group/finally.html) -- Registra un handler di completamento
- [TaskGroup::isFinished](/it/docs/reference/task-group/is-finished.html) -- Verifica se tutti i task sono terminati
- [TaskGroup::isSealed](/it/docs/reference/task-group/is-sealed.html) -- Verifica se il gruppo è sigillato
- [TaskGroup::count](/it/docs/reference/task-group/count.html) -- Ottieni il numero di task
- [TaskGroup::getResults](/it/docs/reference/task-group/get-results.html) -- Ottieni un array di risultati riusciti
- [TaskGroup::getErrors](/it/docs/reference/task-group/get-errors.html) -- Ottieni un array di errori
- [TaskGroup::suppressErrors](/it/docs/reference/task-group/suppress-errors.html) -- Marca gli errori come gestiti
- [TaskGroup::getIterator](/it/docs/reference/task-group/get-iterator.html) -- Itera sui risultati man mano che si completano
