---
layout: tutorial
lang: it
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /it/tutors/08-scope.html
page_title: "Scope"
description: "Scope: chi possiede le coroutine, attende che finiscano e cancella l'intero gruppo."
---

# Scope

Nel capitolo precedente abbiamo avviato dieci worker e chiuso il canale. Il file
è letto, `close()` è stato chiamato, e il flusso principale è andato avanti. Ma un momento:
i worker stanno ancora lavorando sul buffer. La funzione di importazione ha
già restituito il controllo, e il lavoro non è finito. Se lo script PHP dovesse
terminare proprio ora, alcuni indirizzi resterebbero non verificati.

E una seconda preoccupazione da quello stesso capitolo: cosa succede se `checkAddress` dentro un
worker lancia un'eccezione? Dal capitolo sulle eccezioni sappiamo che verrà
memorizzata nell'handle della coroutine, in attesa di un `await`. Ma nessuno aveva intenzione
di fare `await` sui worker. L'errore emergerebbe proprio alla fine, quando
è troppo tardi per correggere qualcosa.

Entrambi i problemi si possono risolvere a mano: raccogliere le coroutine in un array e
fare `await` su ognuna.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... lettura del file ...

foreach ($workers as $worker) {
    await($worker);
}
```

Funziona. Ma è contabilità: devi ricordarti di preparare l'array, portarlo
attraverso l'intero percorso del codice e iterarci sopra alla fine. E se una
coroutine viene avviata da qualche parte in profondità dentro una funzione chiamata, non finisce
nemmeno in quell'array. Quello che vogliamo è che le coroutine sappiano da sole
a chi appartengono.

A questo serve `Scope`.

## Una sandbox per le coroutine

`Scope` è uno spazio in cui vivono le coroutine. Conosce ogni coroutine
avviata al suo interno e può trattarle come un gruppo:

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

La differenza rispetto al capitolo precedente sono due righe: `$workers->spawn()`
invece di `spawn()`, e `awaitCompletion()` alla fine. Il metodo `awaitCompletion`
attende finché ogni coroutine nello scope non finisce, per quante siano.
Nessun array, nessuna contabilità: lo scope tiene traccia da solo.

Il token di cancellazione qui non è opzionale, è un argomento obbligatorio: uno scope
deliberatamente non ti lascia attendere un gruppo senza un limite. Il familiare
`timeout` calza a pennello, e se l'importazione non ce la fa entro un minuto, l'attesa
viene interrotta con un'`OperationCanceledException`, e sta a te
decidere: aspettare ancora un po', o cancellare il gruppo.

## Gli errori non si perdono più

Torniamo al worker che è andato in crash. Una coroutine dentro uno scope non può morire
in silenzio: un'eccezione non gestita risale allo scope genitore. Per impostazione predefinita,
uno scope reagisce con rigore: un errore in una coroutine cancella tutte le altre, e
l'eccezione viene consegnata a chiunque stia aspettando in `awaitCompletion`.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

Questa strategia si chiama fail-together: il gruppo o finisce nel suo insieme,
o si ferma nel suo insieme. Per l'importazione è ragionevole: se `GeoDirectory` va
giù, non ha senso bombardarlo con i restanti nove worker.

Ma il rigore non è sempre ciò che vuoi. Un indirizzo sbagliato nel file non è
un motivo per abbandonare gli altri novantanovemila. In quel caso, assegni
allo scope un gestore di errori, e le coroutine diventano indipendenti: quella fallita
viene registrata, le altre continuano a lavorare:

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

Oltre all'eccezione stessa, il gestore riceve lo scope e la coroutine
fallita: comodo per capire esattamente chi è morto, o per riavviare il lavoro.

La scelta della strategia sta a te, ed è questa la differenza principale rispetto a un
semplice `spawn`: lì, l'unica strategia è "avvia e dimentica".

## Cancellare l'intero gruppo

Nel capitolo sulla cancellazione abbiamo fermato una singola coroutine con `cancel()`.
Uno scope fa lo stesso per un intero gruppo tutto in una volta:

```php
$workers->cancel();
```

Ogni coroutine al suo interno riceve il familiare `AsyncCancellation` nel proprio
punto di attesa: alcune in `recv`, altre in `delay`. Il meccanismo è lo stesso,
cooperativo, è solo che il segnale va a tutti contemporaneamente.

Uno scope può contenere scope figli, e la cancellazione fluisce lungo la gerarchia
in modo ricorsivo: cancella il genitore, e l'intero ramo viene cancellato. Le coroutine
smettono di essere un mucchio sparso di compiti indipendenti e formano un albero, dove ognuna
ha un posto e un proprietario. Questo approccio si chiama concorrenza strutturata,
e si è già dimostrato valido in Kotlin, Swift e Java. TrueAsync lo porta
in PHP.

## Uno scope appartiene a un oggetto

L'uso più elegante di uno scope: consegnarne la proprietà a un oggetto.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* worker e lettura del file */);
        $this->scope->spawn(/* la coroutine di progresso del primo capitolo */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

La durata di vita delle coroutine ora corrisponde alla durata di vita del servizio.
Finché l'oggetto esiste, le sue coroutine continuano a lavorare. Distruggi l'oggetto,
e `dispose()` cancella tutto ciò che era riuscito ad avviare.

Ricordi `$progress->cancel()` del primo capitolo? Abbiamo colto manualmente il
momento in cui la coroutine di progresso diventava superflua. Con uno scope, quella
questione semplicemente svanisce: il progresso serve per tutto il tempo in cui gira l'importazione,
e gira esattamente per tutto il tempo in cui vive `ImportService`. La proprietà è
espressa direttamente nel codice, e semplicemente non resta più alcun posto in cui dimenticare una
coroutine.

## L'intera importazione, dall'inizio alla fine

Mettiamo insieme tutto ciò che abbiamo accumulato in otto capitoli in un'unica
classe funzionante: le coroutine e il progresso del primo capitolo, il
canale con backpressure del settimo, lo scope di questo.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Worker: prelevano gli indirizzi dal canale, non più di $this->workers in modo concorrente
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                foreach ($queue as $address) {
                        checkAddress($address);
                        $counter++;
                }
            });
        }

        // Progresso: renderizza lo stato una volta al secondo finché l'importazione non è finita
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // Produttore: legge il file, il backpressure del canale protegge la memoria
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // Attende tutto: sia i worker sia la coroutine di progresso
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

Un paio di dettagli meritano uno sguardo più attento. Il progresso non è più un ciclo
infinito: la condizione `while ($counter < $total)` lo termina cooperativamente una volta che
l'ultimo indirizzo è stato elaborato, così `awaitCompletion` attende tutto
senza un singolo `cancel`. E `dispose()` nel distruttore non gioca alcun ruolo nel
funzionamento normale: è una rete di sicurezza per quando l'importazione lancia un'eccezione
o l'oggetto viene scartato a metà strada.

Questo è l'essenziale di scope. `spawn` risponde solo alla domanda "come
avvio del lavoro concorrente". Scope gestisce le domande che vengono subito dopo:
chi attende quel lavoro, chi viene a sapere di un errore, e chi lo ferma.
Senza uno scope, una coroutine è lasciata a cavarsela da sola; dentro uno scope, ha
un proprietario e un posto nella struttura del programma.

Finora i worker hanno solo letto dal mondo esterno. Ma gli indirizzi verificati
devono ancora essere salvati in un database. Possiamo semplicemente consegnare a dieci
coroutine un unico oggetto `PDO`? Una buona domanda per aprire il prossimo capitolo.
