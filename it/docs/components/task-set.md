---
layout: docs
lang: it
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /it/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — un insieme dinamico di task con pulizia automatica dei risultati dopo la consegna."
---

# La classe Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Introduzione

`TaskGroup` è perfetto per scenari in cui l'obiettivo sono i risultati, non i task stessi.
Tuttavia, ci sono molte situazioni in cui è necessario controllare il numero di task
mentre i risultati vengono consumati come uno stream.

Esempi tipici:

- **Supervisor**: codice che monitora i task e reagisce al loro completamento.
- **Pool di coroutine**: un numero fisso di coroutine che elaborano dati.

**TaskSet** è progettato per risolvere questi problemi. Rimuove automaticamente i task completati
al momento della consegna del risultato tramite `joinNext()`, `joinAll()`, `joinAny()` o `foreach`.

## Differenze rispetto a TaskGroup

| Proprietà                 | TaskGroup                                | TaskSet                                    |
|---------------------------|------------------------------------------|--------------------------------------------|
| Memorizzazione risultati  | Tutti i risultati fino a richiesta esplicita | Rimossi dopo la consegna                |
| Chiamate ripetute ai metodi | Idempotente — stesso risultato          | Ogni chiamata — elemento successivo        |
| `count()`                 | Numero totale di task                    | Numero di task non ancora consegnati       |
| Metodi di attesa          | `all()`, `race()`, `any()`               | `joinAll()`, `joinNext()`, `joinAny()`     |
| Iterazione                | Le voci rimangono                        | Le voci vengono rimosse dopo `foreach`     |
| Caso d'uso                | Insieme fisso di task                    | Stream dinamico di task                    |

## Idempotenza vs consumo

**La differenza concettuale chiave** tra `TaskSet` e `TaskGroup`.

**TaskGroup è idempotente.** Le chiamate a `race()`, `any()`, `all()` restituiscono
sempre lo stesso risultato. L'iterazione tramite `foreach` attraversa sempre tutti i task.
I risultati sono memorizzati nel gruppo e disponibili per accessi ripetuti:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() restituisce sempre lo stesso primo task completato
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — stesso risultato!

// all() restituisce sempre l'array completo
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — stesso array!

// foreach attraversa sempre tutti gli elementi
foreach ($group as $key => [$result, $error]) { /* 3 iterazioni */ }
foreach ($group as $key => [$result, $error]) { /* di nuovo 3 iterazioni */ }

echo $group->count(); // 3 — sempre 3
```

**TaskSet è consumante.** Ogni chiamata a `joinNext()` / `joinAny()` estrae
l'elemento successivo e lo rimuove dall'insieme. Un `foreach` ripetuto non troverà
le voci già consegnate. Questo comportamento è analogo alla lettura da una coda o un canale:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() restituisce il risultato SUCCESSIVO ogni volta
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — risultato diverso!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — l'insieme è vuoto

// joinAll() dopo il consumo completo — array vuoto
$set->seal();
$rest = $set->joinAll()->await(); // [] — niente da restituire
```

La stessa logica si applica all'iterazione:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// Il primo foreach consuma tutti i risultati
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Il secondo foreach — vuoto, niente da iterare
foreach ($set as $key => [$result, $error]) {
    echo "questo non verrà eseguito\n";
}
```

> **Regola:** se hai bisogno di accedere ai risultati ripetutamente — usa `TaskGroup`.
> Se i risultati vengono elaborati una sola volta e devono liberare memoria — usa `TaskSet`.

## Semantica dei metodi join

A differenza di `TaskGroup`, dove `race()` / `any()` / `all()` lasciano le voci nel gruppo,
`TaskSet` utilizza metodi con semantica **join** — risultato consegnato, voce rimossa:

- **`joinNext()`** — analogo a `race()`: risultato del primo task completato (successo o errore),
  la voce viene rimossa dall'insieme.
- **`joinAny()`** — analogo a `any()`: risultato del primo task completato *con successo*,
  la voce viene rimossa dall'insieme. Gli errori vengono ignorati.
- **`joinAll()`** — analogo a `all()`: array di tutti i risultati,
  tutte le voci vengono rimosse dall'insieme.

## Pulizia automatica

La pulizia automatica funziona in tutti i punti di consegna dei risultati:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

Durante l'iterazione tramite `foreach`, ogni voce elaborata viene rimossa immediatamente:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() diminuisce ad ogni iterazione
    process($result);
}
```

## Limite di concorrenza

Come `TaskGroup`, `TaskSet` supporta la limitazione della concorrenza:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

I task che superano il limite vengono messi in coda e avviati quando uno slot diventa disponibile.

## Panoramica della classe

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Metodi */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Aggiunta di task */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Attesa dei risultati (con pulizia automatica) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Ciclo di vita */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Stato */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Attesa del completamento */
    public awaitCompletion(): void

    /* Iterazione (con pulizia automatica) */
    public getIterator(): Iterator
}
```

## Esempi

### joinAll() — caricamento parallelo con pulizia automatica

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, tutte le voci rimosse

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — elaborazione dei task man mano che completano

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Risultato ottenuto, rimanenti: {$set->count()}\n";
}
```

### joinAny() — ricerca resiliente

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Primo risultato con successo, voce rimossa
$result = $set->joinAny()->await();
echo "Trovato, task attivi: {$set->count()}\n";
```

### foreach — elaborazione in streaming

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Errore nell'elaborazione di $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Voce rimossa, memoria liberata
}
```

### Ciclo worker con aggiunta dinamica di task

```php
$set = new Async\TaskSet(concurrency: 10);

// Una coroutine aggiunge task
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Un'altra elabora i risultati
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Errore: {$error->getMessage()}");
        }
    }
});
```

## Equivalenti in altri linguaggi

| Funzionalità         | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Insieme dinamico     | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Pulizia automatica   | Automatica                        | Gestione manuale              | Gestione manuale          | Gestione manuale       |
| Limite di concorrenza| `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Canale bufferizzato    |
| Iterazione in streaming | `foreach`                      | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Contenuti

- [TaskSet::__construct](/it/docs/reference/task-set/construct.html) — Creare un insieme di task
- [TaskSet::spawn](/it/docs/reference/task-set/spawn.html) — Aggiungere un task con chiave auto-incrementale
- [TaskSet::spawnWithKey](/it/docs/reference/task-set/spawn-with-key.html) — Aggiungere un task con una chiave esplicita
- [TaskSet::joinNext](/it/docs/reference/task-set/join-next.html) — Ottenere il risultato del primo task completato
- [TaskSet::joinAny](/it/docs/reference/task-set/join-any.html) — Ottenere il risultato del primo task con successo
- [TaskSet::joinAll](/it/docs/reference/task-set/join-all.html) — Attendere tutti i task e ottenere i risultati
- [TaskSet::seal](/it/docs/reference/task-set/seal.html) — Sigillare l'insieme per nuovi task
- [TaskSet::cancel](/it/docs/reference/task-set/cancel.html) — Annullare tutti i task
- [TaskSet::dispose](/it/docs/reference/task-set/dispose.html) — Distruggere lo scope dell'insieme
- [TaskSet::finally](/it/docs/reference/task-set/finally.html) — Registrare un handler di completamento
- [TaskSet::isFinished](/it/docs/reference/task-set/is-finished.html) — Verificare se tutti i task sono terminati
- [TaskSet::isSealed](/it/docs/reference/task-set/is-sealed.html) — Verificare se l'insieme è sigillato
- [TaskSet::count](/it/docs/reference/task-set/count.html) — Ottenere il numero di task non ancora consegnati
- [TaskSet::awaitCompletion](/it/docs/reference/task-set/await-completion.html) — Attendere il completamento di tutti i task
- [TaskSet::getIterator](/it/docs/reference/task-set/get-iterator.html) — Iterare sui risultati con pulizia automatica
