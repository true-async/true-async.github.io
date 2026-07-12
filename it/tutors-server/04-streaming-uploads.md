---
layout: tutorial
lang: it
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /it/tutors-server/04-streaming-uploads.html
page_title: "Stream di byte"
description: "send() e sendable(), streaming del body, upload di file e sendFile()."
---

# Stream di byte

Finora le nostre risposte sono state piccole e intere, costruite con
`setBody()` e `json()`. Per un'API è esattamente ciò che serve.

Ma `ProfileService` ha raccolto compiti di tutt'altro calibro. La
contabilità vuole un export annuale, e sono centinaia di megabyte di
`CSV`. Gli utenti caricano file di import, e neanche quelli sono
piccoli. Facciamo un conto approssimativo: cinquanta richieste
concorrenti, ognuna che tiene cento megabyte in memoria... no, meglio
non contare oltre, è già chiaro come va a finire.

Dobbiamo imparare a lavorare con i body a pezzi. In entrambe le
direzioni.

## La risposta a pezzi: send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

Il primo `send()` fissa lo status e gli header, dopodiché i chunk vanno
al client man mano che diventano pronti: chunked in HTTP/1.1, frame DATA
in HTTP/2. In ogni istante in memoria vive una sola riga. Prende forma
uno stream di byte verso il client!

Ora una domanda per mettere alla prova il tuo ingegno. Generiamo righe
dal database a, diciamo, un gigabit al secondo. E il client sta
scaricando su internet mobile in treno. Dove vanno le righe in eccesso?

Se hai letto il capitolo sui channel, hai già la risposta:
backpressure. Quando il buffer dello stream si riempie, `send()` sospende
la coroutine dell'handler. Il client ha svuotato la coda, la coroutine
si è svegliata, la generazione è continuata. L'export si sintonizza
sulla velocità del collo di bottiglia più stretto, e nota, non abbiamo
scritto una singola riga per questo!

Aspettare un client lento, però, non è sempre ciò che vuoi:

```php
if (!$res->sendable()) {
    // send() bloccherà proprio ora. Diciamo che non aspetteremo.
}
```

`send()` è sempre sicuro. `sendable()` ti avverte soltanto: la prossima
chiamata andrà a dormire. Cosa fare poi dipende da te.

> Esiste ancora un tipo popolare di attacco con client lenti: aprono una
> connessione e non leggono, finché il server non si blocca.
> Per un server a coroutine questo è meno spaventoso, dato che ogni
> coroutine costa molto meno di un processo o di un thread.
> Comunque, il limite complessivo di coroutine è un parametro
> importante, così come le altre opzioni di sicurezza aggiuntive!
>

## Il body della richiesta a pezzi: readBody()

La situazione inversa. Un utente carica un CSV da un gigabyte, e per
default l'handler viene chiamato una volta letto l'intero body. La
parola "gigabyte" e le parole "in memoria" nella stessa frase sono
esattamente ciò che abbiamo concordato di evitare.

Attiviamo la modalità streaming:

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

Nel server `TrueAsync` l'handler parte subito dopo gli header, con largo
anticipo. Di fatto, il lavoro della coroutine avviene esattamente al
passo con la ricezione dei dati dal socket. Ecco perché lavorare qui con
lo stream di dati è una scelta naturale.

Se esegui cinquanta upload concorrenti da 20 MiB, il picco di memoria
sarebbe stato 1170 MiB ed è diventato 197. Il throughput è cresciuto di
quasi tre volte, perché l'elaborazione inizia senza aspettare la fine
dell'upload. Niente male per una riga di configurazione.

## Form con file: UploadedFile

Il classico form HTML con un file è un caso più facile, e per esso non
devi attivare nulla. Il multipart viene sempre analizzato come stream, e
l'handler riceve oggetti già pronti:

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

Chiunque abbia visto PSR-7 si sente a casa: `moveTo()`, `getSize()`,
`getClientFilename()`. Più file in un singolo campo (`photos[]`)
arrivano come array tramite `getFiles()`.

## Servire file: sendFile()

Resta il servire file già pronti. Questa è l'unica cosa che non
dovresti assemblare a mano da `fopen` e `send()`, ed ecco perché:

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

Dietro quella singola chiamata si nascondono una trentina d'anni di
storia HTTP. `Content-Type` dall'estensione. `ETag` e `Last-Modified`,
così una richiesta ripetuta se la cava con un breve 304. Download
ripresi tramite `Range` quando il client si è interrotto a metà. Servire
un vicino pre-compresso (`report.csv.gz`) se il client capisce gzip. E
tutto questo con letture asincrone dal disco, senza bloccare il ciclo
degli eventi. Scrivere questo a mano significa dimenticarne almeno la
metà.

Una regola: dopo `sendFile()` la risposta è sigillata. Scriverci
qualcosa di più non funzionerà, otterrai un'eccezione.

Ora possiamo sia accettare sia servire un file da un gigabyte. Ma nota a
chi serviamo tutto questo attraverso un handler PHP: report protetti da
diritti di accesso, file dietro link monouso. E il CSS? E il logo? Sono
uguali per tutti, e avviare una coroutine per ciascuno di essi sembra un
po' scomodo. Questo è il prossimo capitolo, e sarà breve.
