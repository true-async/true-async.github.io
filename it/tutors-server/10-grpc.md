---
layout: tutorial
lang: it
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /it/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unary e streaming, readMessage/writeMessage, trailer e deadline."
---

# gRPC

Finora solo i browser hanno parlato con il nostro server. Ma
`ProfileService` ha anche altri interlocutori: `UserDirectory`,
`GeoDirectory`, la fatturazione. I servizi si parlano tra loro da tempo
non su REST ma su gRPC: contratti rigorosi, streaming in entrambe le
direzioni, deadline e codici di errore già pronti all'uso.

Di solito per gRPC si avvia un server separato su una porta separata.
Chiediti: perché, in realtà? gRPC è un protocollo su HTTP/2 e HTTP/3. Su
ciò che è già in ascolto per noi. Al server basta distinguere queste
richieste in base al content-type `application/grpc` e consegnarle a un
handler separato. Ed è esattamente ciò che fa.

## Prima il contratto

Una conversazione gRPC non comincia con il codice. Comincia con un
contratto, e questa è forse la principale differenza culturale rispetto
a REST. Descriviamo il servizio profilo in `profile.proto`:

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

Il compilatore protobuf genera classi PHP da questo, e il runtime si
installa con Composer:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Ora il progetto ha `Profile\GetProfileRequest` e `Profile\Profile`:
getter e setter tipizzati, serializzazione. E protoc genererà esattamente
le stesse classi per un client in Go, Java o Python. È tutto qui il
punto: un contratto, qualsiasi linguaggio.

## Messaggi invece di body

In cosa differisce un handler gRPC da un handler HTTP? Nell'unità di
comunicazione. Lì avevamo un "body della richiesta" e un "body della
risposta", uno ciascuno. Qui è un flusso di messaggi in ogni direzione:
`readMessage()` restituisce i byte del successivo messaggio in arrivo o
`null` alla fine, e `writeMessage()` invia un messaggio in uscita. Il
server è responsabile del framing gRPC, delle lunghezze e dei flag. Le
classi generate sono responsabili dei contenuti:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // il path della richiesta nomina il metodo del contratto
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // byte -> oggetto

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // oggetto -> byte
});
```

Il routing qui è solo il path: package, service, method. Un client in
qualsiasi linguaggio, chiamando `GetProfile`, invia una POST a
`/profile.ProfileService/GetProfile`. E l'handler stesso vive accanto
alle route REST e vede lo stesso pool già riscaldato e lo stesso contesto
di richiesta.

Tutte e quattro le forme di gRPC nascono da questa stessa API e
differiscono solo nel numero di chiamate:

```php
// Unary: un messaggio in andata, uno in ritorno
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: uno in andata, molti in ritorno
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex: lettura e risposta intrecciate
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` mette la coroutine in pausa fino al messaggio
successivo, e `writeMessage()` risponde subito, senza aspettare la fine
del flusso in arrivo. Lo stesso duplex di WebSocket, solo con un
contratto e secondo lo standard.

## Passare gli errori

gRPC ha il proprio sistema di codici di errore, e vive in un posto che
all'inizio confonde. Lo status HTTP della risposta è sempre 200. Sempre.
Il risultato reale viaggia nei trailer, header che HTTP/2 invia dopo il
body. Li abbiamo intravisti nel capitolo sullo streaming, ed ecco il
loro principale consumatore:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // un return pulito: il server stesso aggiunge grpc-status: 0 (OK)
});
```

Anche i crash vengono gestiti: un'eccezione che vola fuori dall'handler
si trasforma in `grpc-status: 13` (INTERNAL), invece che in una
connessione caduta.

## Deadline

Ricordi quanti capitoli della prima serie abbiamo dedicato all'idea che
"ogni attesa deve avere un limite"? Ebbene, in gRPC quell'idea è elevata
a standard di protocollo. Il client passa la propria deadline
direttamente nella richiesta, tramite l'header `grpc-timeout`, e il
server la consegna all'handler:

```php
$deadline = $req->getGrpcTimeout(); // millisecondi o null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Pensa a quanto è giusta questa meccanica. Al client restano duecento
millisecondi di pazienza? Allora non ha senso andare da `GeoDirectory`
con un timeout di due secondi. La deadline viene infilata attraverso
tutte le attese interne, attraverso tutti i servizi della catena, e
l'intero sistema rispetta la pazienza del primissimo chiamante.

## La fine della seconda serie

Ecco tutto il percorso. Diamo un'ultima occhiata all'indietro.

I quindici capitoli della prima serie costruivano un vocabolario:
coroutine, cancellazione, `Future`, canali, scope, gruppi, pool, thread,
contesto. Onestamente, a tratti poteva sembrare che il vocabolario fosse
eccessivo. E poi è arrivata la seconda serie, ed è saltato fuori che il
server è solo una frase composta di quelle stesse parole. Ogni richiesta
è una coroutine. Il pool protegge il database. Lo scope fa pulizia dopo
la richiesta. Il backpressure tiene a bada il sovraccarico. I thread
occupano i core. E in cima, lo static, l'SSE, il WebSocket e il gRPC su
un'unica porta.

Nota anche cosa non c'era in nessuna delle due serie: callback, catene
di `.then()`, le parole chiave `async` e `await` a righe alterne, la
gestione manuale dell'event loop. Tutto il codice è ordinario PHP
sequenziale. Ha semplicemente smesso di aspettare per niente.

Da qui in poi sei da solo. Prendi il servizio che da tempo chiede a gran
voce una riscrittura, e comincia con un singolo handler. Il riferimento
delle classi è nella [documentazione del
server](/it/docs/server/index.html), e gli interni sono
nell'[architettura](/it/architecture/server.html). E se qualcosa si
comporta diversamente da ciò che questi capitoli hanno promesso, ora sai
abbastanza da presentare un buon bug report.
