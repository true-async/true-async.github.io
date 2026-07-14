---
layout: tutorial
lang: it
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /it/tutors/07-channels.html
page_title: "Channels"
description: "Channel: un flusso di valori tra coroutine, un pool di worker e il backpressure."
---

# Channels

`Future` promette esattamente un valore. Ma cosa succede se i valori sono molti e
arrivano gradualmente?

Ricorda il file CSV del primo capitolo. Ora il compito è più impegnativo: durante
l'importazione, l'indirizzo di ogni utente deve essere verificato rispetto a `GeoDirectory`.
Sappiamo già come usare le coroutine, quindi proviamo l'approccio diretto:

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

Il file ha centomila righe. Questo codice creerà centomila
coroutine, e tutte apriranno in modo concorrente una connessione a `GeoDirectory`.
Le coroutine sono economiche, le connessioni no. Il servizio si strozzerà, e con esso
la nostra importazione.

Quello che vogliamo invece è che, diciamo, dieci coroutine si occupino della verifica, mentre
il resto degli indirizzi attende il proprio turno. Ci serve una coda da cui alcune coroutine
prelevano il lavoro e a cui altre lo aggiungono.

Una tale coda si chiama canale.

## Channel

Un canale collega le coroutine direttamente, come un tubo:

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — deposita un valore nel canale.
- **`recv`** — preleva un valore dal canale.

Entrambe le operazioni bloccano, ed è proprio questo il punto. Se il canale è vuoto, `recv`
sospende la coroutine finché non compaiono dati. Se il canale è pieno, è `send`
a essere sospeso. Il `5` nel costruttore imposta la dimensione del buffer:
quanti valori il canale è disposto a trattenere prima che qualcuno li prelevi.

## Rendezvous

Cosa succede se crei un canale con un buffer di `0`? Non ha alcun posto dove
memorizzare i valori, quindi `send` non si completa finché un'altra coroutine non chiama `recv`:

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // viene eseguito solo dopo recv
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

Un tale canale si chiama rendezvous: il mittente e il destinatario sono costretti
a incontrarsi nello stesso punto nel tempo, da cui il nome.

La differenza rispetto a un canale con buffer è più sottile di quanto sembri. Un buffer significa
"inviato" ma non "ricevuto": `send` deposita un valore e va avanti, e il mittente
non ha idea se, o quando, verrà prelevato. Un rendezvous garantisce la consegna:
una volta che `send` ritorna, il valore è già nelle mani del destinatario. Questo conta
quando un compito non può restare fermo in una coda: per esempio, consegnare del lavoro a un
worker solo se è libero in questo preciso momento.

I dati sono quasi irrilevanti qui: un rendezvous è pura sincronizzazione.
Due coroutine hanno la garanzia di incontrarsi nello stesso momento, anche se tutto ciò
che si scambiavano era `null`.

## Pool di worker

Assembliamo una soluzione per l'importazione. Dieci coroutine worker prelevano indirizzi
da un canale, mentre il flusso principale legge il file e alimenta il canale:

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

Ogni valore del canale va esattamente a un worker, anche se tutti e dieci sono
in attesa su `recv`. I valori non vengono mai duplicati, così i worker non si pestano
i piedi a vicenda: il canale distribuisce il lavoro da solo tra chiunque sia libero.

Per quante righe ci siano nel file, non ci sono mai più di dieci connessioni
a `GeoDirectory`. Il numero di worker è esattamente il limite di concorrenza,
ed è impostato da una singola costante nel ciclo.

## Backpressure

Perché un buffer esattamente di `100`? Immagina che i worker verifichino gli indirizzi più lentamente
di quanto il flusso principale legga il file. Senza un limite, la coda continuerebbe a crescere
finché l'intero file di centomila righe non fosse in memoria.

Con un buffer di `100`, accade qualcosa di diverso: non appena un centinaio di
indirizzi si accumulano nel canale, `send` sospende il flusso principale. La lettura del
file si mette in pausa e riprende una volta che i worker liberano spazio. Il produttore
si adatta automaticamente alla velocità dei consumatori.

Questo meccanismo si chiama backpressure. Nota che non lo abbiamo programmato
noi stessi: deriva dalla natura bloccante di `send`. Basta scegliere una dimensione
del buffer, e tutto il resto si bilancia da solo.

## Chiudere un canale

Una volta letto il file, i worker continuano ad aspettare su `recv`. Una situazione familiare:
nel capitolo sulla cancellazione, anche la coroutine di progresso continuava a girare all'infinito.
Ma qui non ci serve `cancel()` su ogni worker; un canale ha uno strumento più preciso:

```php
$queue->close();
```

`close` annuncia: non arriveranno nuovi valori. I worker prima finiscono di leggere
tutto ciò che resta nel buffer, e poi `recv` lancia `ChannelException`,
terminando il ciclo `while (true)`. Nota l'ordine: la chiusura non taglia corto il lavoro,
gli permette di finire correttamente.

E un altro dettaglio familiare: `recv` e `send` accettano lo stesso token di cancellazione
dell'`await` del capitolo sui timeout:

```php
$address = $queue->recv(timeout(5000));
```

Se nulla compare nel canale entro cinque secondi, il worker riceve un
`AsyncCancellation` e può, per esempio, registrare un avviso.

## Passare dati o sincronizzare?

Diamo uno sguardo più attento a cosa stava effettivamente facendo il canale in questo capitolo.
`recv` su un canale vuoto ha messo a dormire un worker finché non è comparso del lavoro. `send` su
un canale pieno ha messo a dormire la lettura del file finché i worker non hanno svuotato la coda.
Il rendezvous ha portato due coroutine insieme nello stesso momento nel tempo. Ogni
operazione bloccante si è rivelata un punto in cui le coroutine si adattano l'una all'altra.

E qui vale la pena notare una sottigliezza del mondo single-thread. Per passare
dati in quanto tali, un canale non è necessario: le coroutine vivono in memoria condivisa, e un
oggetto può semplicemente essere consegnato loro tramite `use`. Le corse critiche sui dati non avvengono in un
singolo thread; due coroutine non sono mai in esecuzione nello stesso identico momento.
Un canale viene usato per qualcos'altro: una coda limitata, distribuire il lavoro tra
worker liberi, segnalare "niente più lavoro" tramite `close`.

Quindi è più corretto pensare a un canale in questo modo: è un modo di sincronizzare
le coroutine che per giunta sposta dei dati, non il contrario. In
codice multi-thread, invece, dove le coroutine sono distribuite su thread
diversi, un canale diventa indispensabile in entrambi i ruoli: lì non c'è memoria
condivisa, e resta l'unico ponte sicuro.

Ora abbiamo due modi per collegare tra loro le coroutine. `Future` promette un valore.
Un canale trasporta un intero flusso di valori e, lungo la strada, imposta un ritmo condiviso
per il lavoro: il produttore non sa chi preleverà i dati né quando,
il consumatore non sa da dove provengano, ma nessuno inonda nessun altro di lavoro.

Resta un pensiero assillante. Abbiamo avviato dieci worker e siamo andati avanti. E se
uno di loro muore con un'eccezione a metà dell'importazione? Chi vigila davvero
su tutte queste coroutine? Scopriamolo nel prossimo capitolo.
