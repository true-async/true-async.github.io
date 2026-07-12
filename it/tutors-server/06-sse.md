---
layout: tutorial
lang: it
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /it/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE: un flusso di eventi verso il browser, avanzamento dell'import e heartbeat tramite sseComment()."
---

# Server-Sent Events

E così l'import degli indirizzi ora parte con un pulsante sulla pagina.
L'utente ha cliccato, il file è partito, l'elaborazione è iniziata. Va
avanti per una decina di minuti. Cosa vede l'utente per tutto quel
tempo?

Esatto, uno spinner che gira. Per dieci minuti. Senza il minimo segno
di vita. Verso il terzo minuto deciderà che si è tutto bloccato,
aggiornerà la pagina e farà partire l'import una seconda volta. Ci serve
una barra di avanzamento.

La soluzione classica è il polling: il browser interroga
`/import/progress` una volta al secondo, il server risponde con un
numero. Funziona? Funziona. Ma fai i conti: seicento richieste in dieci
minuti, con gli header, con un ciclo completo di elaborazione, e in
ognuna il payload è un singolo numero. Quello che vorremmo è invece
l'opposto: il browser si connette una volta sola, e da lì in poi è il
server stesso a inviare il numero ogni volta che cambia.

È esattamente ciò che fa `SSE`, `Server-Sent Events`. Nessun nuovo
protocollo. Un'ordinaria risposta `HTTP` che il server non chiude, ma
alla quale continua ad aggiungere eventi. Lato browser vengono ricevuti
dall'`EventSource` integrato, senza una singola libreria.

## Avanzamento verso il browser

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... routing ... */ }

    $import = currentImport(); // lo stesso ImportService della prima serie

    $res->sseStart();
    $res->sseRetry(3000); // se il flusso si interrompe, il browser si riconnette dopo 3 secondi

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // la scheda è stata chiusa, non c'è nessuno per cui disegnare
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

E nel browser:

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

Guarda con attenzione la struttura dell'handler. Un ciclo. Una lettura
del valore. `delay(1000)`. Ti dice qualcosa? È la coroutine di
avanzamento del primissimo capitolo, lettera per lettera. È cambiata
solo l'ultima riga: al posto dell'`echo` sul terminale, `sseEvent()`
dentro una risposta aperta. Quindici capitoli dopo la barra di
avanzamento è arrivata al browser, e il codice è cambiato appena. E,
come allora, l'avanzamento non sa nulla dell'import, e l'import non sa
nulla dell'avanzamento.

Non c'è magia neanche sotto il cofano: i metodi SSE sono una sottile
formattazione sopra `send()` del capitolo quattro. Da lì, due regali
gratuiti. Backpressure: una scheda lenta non divorerà la memoria del
server. E indipendenza dal protocollo: lo stesso handler funziona su
`HTTP/1.1`, `HTTP/2` e `HTTP/3`, ed è il browser a scegliere.

## Lungo silenzio e heartbeat

Una connessione `SSE` vive per minuti e ore. La lunga vita, come al
solito, ha i suoi malanni. Qui ce ne sono due.

Il primo: il timeout di scrittura. Per impostazione predefinita il
server limita quanto a lungo una risposta può impiegare per essere
inviata, ed è corretto. Ma una risposta SSE è "in fase di invio" per
sempre, è la sua natura. Per un servizio con flussi disattivi il limite:

```php
$config->setWriteTimeout(0);
```

Il secondo malanno è più sottile. Supponi che l'import si blocchi a
lungo: sta calcolando qualcosa di pesante, non vengono emessi eventi.
Per noi è una pausa, ma per qualche proxy tra il server e il browser è
una connessione morta che va terminata. E la terminerà, nginx per
impostazione predefinita usa sessanta secondi per questo.

La cura è comica nella sua semplicità:

```php
$res->sseComment(); // sul filo: ":\n\n"
```

Un commento. Un evento che il browser ignora in silenzio, ma che viaggia
attraverso il filo e convince ogni intermediario che la connessione è
viva. Invialo a intervalli durante le pause, e il flusso sopravviverà a
qualsiasi silenzio.

## Interruzioni e ripristino

La rete mobile ha avuto un guizzo, il flusso si è interrotto. Cosa fare?
Niente. Sul serio: `EventSource` ripristina la connessione da solo, dopo
aver aspettato l'intervallo impostato con `sseRetry()`.

L'unica cosa in cui vale la pena aiutarlo è a non ripartire da zero.
Assegna un numero agli eventi:

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

Alla riconnessione il browser invia un header `Last-Event-ID` con
l'ultimo numero ricevuto, e l'handler continua esattamente da quel
punto:

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

Consegna, riconnessione, recupero di ciò che è stato perso. Un canale di
notifica onesto, e tutto questo sul più ordinario degli HTTP.

Con una sola avvertenza: il canale è a senso unico. Il server parla, il
browser ascolta. Per una barra di avanzamento è ideale. Ma per una chat
di supporto, dove entrambe le parti scrivono? Per una chat ti servirà
qualcosa di più serio.
