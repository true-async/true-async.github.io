---
layout: tutorial
lang: it
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /it/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet: un flusso di task che si autopulisce, joinNext/joinAny/joinAll e un ciclo di supervisione."
---

# TaskSet

Il capitolo precedente ha rivelato che `TaskGroup` ricorda tutto. Non è un caso, è una proprietà
su cui puoi fare affidamento: per quante volte chiedi al gruppo i risultati, ottieni sempre la
stessa risposta. Questo comportamento si chiama idempotenza, e ci siamo già imbattuti in esso:
un `await` ripetuto su una coroutine restituisce ogni volta lo stesso risultato.

Ma la memoria ha un prezzo. Fai passare centomila task attraverso un gruppo, e tutti i centomila
risultati restano lì dentro, anche se ciascuno serviva una sola volta, nel momento in cui è
diventato pronto. Per una pipeline che gira per ore, questo non è archiviazione, è una perdita di
memoria.

Serve un gemello di `TaskGroup` dal temperamento opposto: consegna il risultato e dimenticalo. Si
chiama `TaskSet`.

## Consumare invece di archiviare

In superficie sembra tutto uguale: `spawn`, `close`, un limite di concorrenza. La differenza sta
in ciò che accade a un risultato dopo che è stato consegnato:

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, ne esce già uno diverso!
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, l'insieme è vuoto
```

Ogni chiamata a `joinNext()` restituisce il prossimo risultato pronto e rimuove la sua voce
dall'insieme. Confrontalo con `race()` di `TaskGroup`, che restituisce sempre lo stesso primo
vincitore per quante volte lo chiami. `TaskSet` si comporta non come un archivio ma come una coda:
leggilo, ed è sparito. Sì, è la stessa semantica di `recv` dal capitolo sui canali, solo che ora
la coda contiene non valori ma task che si completano.

I metodi di attesa dei gemelli fanno rima tra loro:

- **`joinNext()`** — come `race()`: il primo a finire, la sua voce rimossa.
- **`joinAny()`** — come `any()`: il primo che ha successo, la sua voce rimossa.
- **`joinAll()`** — come `all()`: tutti i risultati in una volta, l'insieme svuotato.

Il prefisso `join` suggerisce già la differenza: un risultato non viene solo letto, viene
prelevato.

## Una pipeline senza perdite

Riscriviamo l'importazione di centomila righe con ciò che ora sappiamo:

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Indirizzo non verificato: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

Una coroutine legge il file e continua ad alimentarlo con task, mentre il flusso principale
elabora i risultati man mano che diventano pronti. Ogni voce elaborata viene immediatamente
rimossa dall'insieme, così la memoria contiene solo i task in corso: dieci in esecuzione più la
coda. Il file può essere di qualsiasi dimensione, l'uso della memoria non dipende da esso.

Nota come dettagli familiari si siano uniti in un quadro nuovo: un limite di concorrenza al posto
di un pool di worker fatto a mano, `close()` come segnale che "non arrivano più task", la coppia
`[$result, $error]` al posto di eccezioni silenziosamente inghiottite, e il `PDO` dal capitolo
nove, indisturbato dalle chiamate concorrenti a `saveAddress`.

## Supervisore

C'è un secondo scenario in cui questa semantica di consumo è indispensabile: codice che veglia su
task a lunga durata e reagisce quando terminano.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Servizio $key fermato" . ($error ? ": {$error->getMessage()}" : ''));

    // riavvia il servizio che è caduto
    $set->spawnWithKey($key, restartService($key));
}
```

L'insieme non viene mai chiuso, quindi il `foreach` non finisce mai, aspetta soltanto l'evento
successivo. Ogni voce elaborata viene rimossa, il servizio riavviato viene aggiunto di nuovo al
suo posto, e il ciclo vive per sempre. Il supervisore non ha bisogno di uno storico di ogni
completamento dall'inizio dei tempi; ha bisogno esattamente di questo: uno dei suoi assistiti si è
fermato, vai a capire perché e riavvialo. Non potresti scrivere questo ciclo con `TaskGroup`: il
suo `foreach` ricomincerebbe dal primo servizio che si è fermato, ogni singola volta.

Quindi questa, in sostanza, è tutta la differenza tra i gemelli: la memoria. Un gruppo archivia i
risultati e risponde ripetutamente a qualsiasi domanda su di essi, il che lo rende adatto ai casi
in cui l'insieme di task è fisso e i risultati contano nel loro complesso. Un insieme consegna
ogni risultato una sola volta e libera immediatamente la memoria, ed è per questo che può gestire
un flusso infinito di task. C'è una regola semplice per scegliere: se la tua domanda ai task è
"cosa avete prodotto?", scegli `TaskGroup`; se è "qual è il prossimo?", scegli `TaskSet`.

Negli ultimi quattro capitoli abbiamo costruito la stessa cosa tre volte: percorrere una
collezione, svolgendo lavoro concorrente su ogni elemento sotto un limite. Una volta con un canale
e dei worker, una volta con `TaskGroup`, una volta con `TaskSet`. Non è forse ora che questo
pattern ottenga un nome tutto suo e si riduca a una sola riga?
