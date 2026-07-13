---
layout: tutorial
lang: it
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /it/tutors-laravel/02-pool-transactions.html
page_title: "Pool di connessioni e transazioni"
description: "PDO Pool sotto Eloquent e CoroutineTransactions: perché il contatore delle transazioni annidate non può restare in una proprietà di Connection."
---

# Pool di connessioni e transazioni

`Auth`, `session`, `request`: li abbiamo sistemati nel capitolo
precedente, context più un proxy, e il framework ha smesso di confondere
le richieste. Il database sembra ancora più semplice: il capitolo nove
della serie sui fondamenti l'ha già risolto, il `PDO Pool` consegna a
ogni coroutine la propria connessione e la riprende da sola. Cosa
potrebbe mai andare storto per `Eloquent` qui?

Può andare storto. Il pool gestisce la connessione in modo trasparente.
Ma non sa nulla di un altro pezzo di stato che `Laravel` tiene proprio
accanto a quella connessione: il contatore di annidamento delle
transazioni.

## Dove vive `transactionLevel()`

Dentro `Illuminate\Database\Connection` c'è una normale proprietà
di istanza:

```php
protected $transactions = 0;
```

`beginTransaction()` la incrementa, `commit()` e `rollBack()` la
decrementano. Finché una `Connection` serve un processo, questo ha
perfettamente senso: una proprietà, una transazione. Ma `PDO Pool`
opera un livello sotto `Connection`. Sostituisce la connessione fisica
sotto l'oggetto, mentre l'oggetto `Connection` stesso, quello a cui
`$this->transactions` è collegato, resta un'unica istanza condivisa
in tutto il `DatabaseManager`.

Ripercorriamo lo scenario del capitolo precedente, questa volta con
il database:

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // la coroutine si addormenta proprio dentro la transazione
    });

    $response->json(['ok' => true]);
});
```

Due richieste entrano in `DB::transaction()` concorrentemente. Entrambe
le connessioni fisiche vengono onestamente distribuite dal pool, ognuna
la propria. Ma `$this->transactions` per entrambe è lo stesso numero
sullo stesso oggetto `Connection`. La prima coroutine porta il contatore
a `1`, poi si addormenta. La seconda lo incrementa a sua volta, ma ora
a `2`, anche se per lei questa avrebbe dovuto essere una transazione
esterna al livello `1`. Il `commit()` nella prima coroutine si
moltiplica contro il livello di annidamento sbagliato, e Laravel emette
silenziosamente un `SAVEPOINT` dove non dovrebbe, oppure conferma
prematuramente una transazione che una coroutine vicina sta ancora
tenendo aperta.

## Stessa ricetta, scope diverso: la coroutine, non l'albero della richiesta

Nel capitolo precedente lo stato di `auth` viveva nello scope context
perché è condiviso tra tutte le coroutine di una richiesta. Il
contatore delle transazioni è costruito diversamente: `PDO Pool`
distribuisce una connessione fisica per *coroutine*, non per l'intera
richiesta (un `TaskGroup` parallelo dentro un handler riceve due
connessioni separate dal pool). Quindi il contatore deve vivere nel
coroutine context, non nello scope context:

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack() e i gestori di errore
    // vengono sovrascritti allo stesso modo: invece di leggere e
    // scrivere $this->transactions, passano attraverso
    // setTransactionLevel()/transactionLevel().
}
```

`coroutine_context()` contro `current_context()`, è esattamente il
confine discusso nel capitolo `Context` della serie sui fondamenti: il
primo è privato a una singola coroutine, il secondo è condiviso
nell'intero albero di coroutine di una richiesta. La scelta qui non è
una questione di stile, è obbligatoria: confonderli e due chiamate
parallele al database dentro una richiesta iniziano di nuovo a
condividere il contatore delle transazioni di qualcun altro, il buco
si sposta solo di un piano più in alto.

Il trait non riscrive `Connection` interamente, intercetta
chirurgicamente i metodi che toccano `$this->transactions`, ed è
collegato a una classe di connessione specifica:

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

C'è una classe separata per ogni `DBMS`, `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`, `AsyncSqliteConnection`,
`AsyncSqlServerConnection`, perché le classi genitore di Laravel sono
già diverse, mentre il trait di isolamento del contatore è lo stesso
per tutte.

## Perché non puoi semplicemente mettere in scope l'intero `DatabaseManager`

La tentazione c'è: dato che sappiamo già come nascondere un servizio
dietro il context (`ScopedServiceProxy` dal capitolo precedente),
perché non fare lo stesso per `db`? La ragione per cui non succede è
piuttosto sgradevole. `DatabaseServiceProvider::boot()` scrive questo
una volta sola all'avvio:

```php
Model::setConnectionResolver($app['db']);
```

Quella è una proprietà statica sulla classe `Model` stessa, condivisa
da ogni modello e ogni richiesta. Se `db` fosse risolto diversamente
per ogni scope, questo riferimento statico continuerebbe a puntare al
`DatabaseManager` di qualunque richiesta l'abbia creato per prima. Una
volta che lo scope di quella richiesta termina e fa pulizia, l'oggetto
a cui `Model::$resolver` punta viene raccolto dal garbage collector, e
la proprietà statica resta a puntare a memoria morta. Il risultato non
è "dati sbagliati", è l'intero processo che va in crash.

Quindi `db` resta un singleton, come è sempre stato. L'isolamento della
connessione fisica è compito del `PDO Pool` a livello `C`, non del
container di dependency injection. L'isolamento del contatore di
transazioni è compito del trait a livello di una singola coroutine. Due
strumenti stretti e precisi invece di un grande refactoring che
manderebbe in più anche il server giù.

Abbiamo affrontato lo stato della richiesta e lo stato della
transazione. Laravel gestisce le normali risposte HTTP da solo,
bufferizzandole per intero. Ma cosa succede se la risposta non è
occasionale, ma uno stream: una barra di avanzamento verso il browser,
o una chiamata da un servizio vicino via gRPC? È lì che ci dirigiamo
nel prossimo capitolo.
