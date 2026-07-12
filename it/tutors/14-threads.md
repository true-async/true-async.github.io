---
layout: tutorial
lang: it
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /it/tutors/14-threads.html
page_title: "Thread"
description: "spawn_thread e ThreadPool: vero parallelismo per il calcolo, isolamento e copia dei dati."
---

# Thread

Tutti i nostri strumenti finora hanno vissuto dentro un singolo thread del sistema operativo. Le
coroutine creavano l'impressione che le cose accadessero nello stesso momento, ma in ogni istante
esattamente una di esse era davvero in esecuzione. Per il lavoro di importazione e le richieste a
`GeoDirectory`, questo era più che sufficiente: i task per lo più aspettavano, e l'attesa si divide
splendidamente.

Ora ecco un tipo di compito diverso. Una volta al giorno, `ProfileService` costruisce un report
annuale: un minuto intero di puro calcolo, senza una singola chiamata di rete o al database.
Eseguiamolo in una coroutine, accanto al nostro familiare ticker:

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // un minuto di puro calcolo
    echo "report ready\n";
});
```

Il ticker tace per un minuto intero. Ricorda il capitolo uno: le coroutine si scambiano nei punti
di await, a `sleep`, `delay`, I/O. Ma `buildYearlyReport` non ha un solo punto di await, solo cicli
e aritmetica. Lo scheduler non riprende mai il controllo, e l'intero processo, ticker, worker,
gestione delle richieste, tutto quanto, resta lì a guardare una coroutine macinare numeri.

Le coroutine ti danno concorrenza, non parallelismo. Quando un task è vincolato dalla CPU invece
che dall'attesa, serve un secondo processore. O più precisamente, un secondo thread del sistema
operativo.

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` lancia la closure in un thread separato del sistema operativo, su un core della CPU
diverso. Il report ora viene calcolato davvero in parallelo: il ticker continua a ticchettare, i
worker continuano a lavorare, e lo scheduler non ha idea che del lavoro pesante stia accadendo
proprio lì accanto.

Dall'esterno, un thread sembra quasi una coroutine: puoi passarlo al familiare `await`, che
sospende solo la coroutine in attesa. Anche un'eccezione dal thread raggiunge `await`, avvolta in
`Async\RemoteException`.

## Niente in comune

Quasi come una coroutine, ma con una differenza fondamentale. Nel capitolo sui canali abbiamo
detto che le coroutine vivono in memoria condivisa, puoi semplicemente passare un oggetto tramite
`use`, e le race sui dati non accadono all'interno di un singolo thread. Ebbene, quel trucco non
funziona con i thread. Ogni thread ha il proprio ambiente PHP: le proprie variabili, le proprie
classi, le proprie proprietà statiche. Non c'è affatto memoria condivisa.

Ecco perché tutto ciò che viene passato in un thread viene copiato per intero:

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // questa è una COPIA di $rows: le modifiche qui non sono visibili all'esterno
    return buildYearlyReport($rows);
});
```

Questa regola porta con sé anche delle restrizioni: non puoi passare in un thread un riferimento
PHP (`&$var`), una risorsa come un file aperto, o un oggetto con proprietà dinamiche. Tentare di
farlo lancia `ThreadTransferException` immediatamente, all'inizio, invece di causare comportamenti
misteriosi più avanti.

Le regole sono severe, ma sono oneste: senza stato condiviso, non ci sono race, lock, mutex, o
qualsiasi altro incubo del classico multithreading. I thread di TrueAsync comunicano allo stesso
modo delle coroutine: passando valori, non condividendo memoria.

A proposito, una vecchia conoscenza sa come attraversare in modo significativo il confine del
thread. `FutureState` dal capitolo sei può essere passato in un thread mentre il suo `Future` resta
indietro:

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

Il produttore è in un thread, il consumatore in un altro, e il contratto è esattamente lo stesso.
Ecco perché `Future` è stato diviso in due oggetti separati fin dall'inizio: il confine tra loro si
è rivelato abbastanza solido da farci correre lungo un confine di thread.

## ThreadPool

Un thread è un'entità costosa: il suo ambiente PHP deve essere creato, inizializzato e riscaldato.
Un task al minuto, certo, nessun problema, ma avviare un thread per ogni piccolo task è altrettanto
uno spreco quanto aprire una connessione al database a ogni richiesta.

Sai già cosa fare con le risorse costose. Giusto, mettile in pool:

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

Otto thread worker vengono creati una volta e vivono finché vive il pool. `submit` mette un task in
coda, un worker libero lo raccoglie e restituisce il risultato. E guarda cosa restituisce `submit`:
un `Future`, la promessa di un risultato che qualcun altro produrrà. Nel capitolo sei quel
"qualcun altro" era una coroutine; ora è un intero thread separato, e il contratto non è cambiato di
una virgola.

La coda del pool ha un limite, e una volta che si riempie, `submit` sospende la coroutine
chiamante. La riconosci? È la contropressione (back-pressure) dal capitolo sui canali: il
produttore di task si autoregola automaticamente per adeguarsi alla velocità dei worker.

Tieni il numero di worker vicino al numero di core della CPU: a differenza dell'attesa, il calcolo
ha bisogno di core fisici reali, e venti thread su otto core si limiteranno a darsi di gomito a
vicenda. Per impostazione predefinita, senza il parametro `workers`, il pool determina da solo il
parallelismo disponibile, tenendo conto anche delle quote dei container.

E per il caso più comune, "elaborare una lista in parallelo", c'è una forma di una sola riga che
già conosci da `iterate`:

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` distribuisce gli elementi tra i worker, aspetta tutti quanti, e restituisce i risultati nel
loro ordine originale.

Quindi risulta che la concorrenza ha due dimensioni. Le coroutine comprimono l'attesa: migliaia di
task condividono un singolo thread e non si intralciano a vicenda mentre aspettano. I thread
aggiungono vero parallelismo: il calcolo si distribuisce sui core della CPU. Questi strumenti non
competono tra loro, si completano a vicenda: dove il codice aspetta, scegli una coroutine; dove
calcola, scegli un thread; e una volta che ne hai molti dell'uno o dell'altro, un pool viene in
soccorso.

Infine, dai un'occhiata a cosa è diventato il nostro processo: centinaia di coroutine, tutte
mescolate insieme, che servono utenti diversi, task che saltano tra worker e thread. E in quella
folla, una domanda semplice si rivela sorprendentemente difficile: dove tieni "quello corrente"?
L'utente corrente, la lingua corrente, l'ID della richiesta? C'è una sola variabile globale per
tutti, e ci sono migliaia di coroutine. È di questo che parla l'ultimo capitolo.
