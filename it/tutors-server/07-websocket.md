---
layout: tutorial
lang: it
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /it/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket: il ciclo recv, una stanza di chat, l'invio da altre coroutine e trySend contro i client lenti."
---

# WebSocket

In una chat di supporto scrivono entrambe le parti. L'utente fa una
domanda, l'operatore risponde, e nessuno dei due aspetta l'altro: i
messaggi vanno in entrambe le direzioni ogni volta che vengono scritti.

Possiamo costruire una chat del genere con gli strumenti che già
conosciamo? Verso il basso, dal server al browser, la porta SSE, sappiamo
farlo dal capitolo di ieri. E verso l'alto? Verso l'alto dovremmo
inviare una POST separata per ciascuna riga dell'utente. Una nuova
richiesta, gli header, una risposta, una disconnessione. E così per ogni
"grazie, mi è stato utile". Funzionerebbe, ma non particolarmente bene.

Per una conversazione bidirezionale esiste un protocollo apposito,
WebSocket.

È costruito in modo sorprendentemente modesto. Il client invia
un'ordinaria richiesta HTTP con un header `Upgrade`: una proposta di
passare a un altro protocollo. Il server acconsente: `101 Switching
Protocols`. È tutto, l'HTTP è finito. Sulla stessa connessione TCP i
messaggi ora viaggiano in entrambe le direzioni, senza richieste e senza
risposte.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

Il server si prende interamente carico dell'handshake: l'handler viene
chiamato quando la connessione è già commutata, e riceve un oggetto già
pronto. Il modello è familiare: una connessione, una coroutine.
`WebSocket` implementa `Iterator`, ed è l'iteratore che mette la
coroutine in pausa fino al messaggio successivo. Il client se n'è
andato, il ciclo è terminato, il server ha chiuso da solo la connessione
con il codice `1000 Normal`. E gli ordinari handler HTTP continuano a
funzionare a fianco, sulla stessa porta.

## Una stanza di chat

L'echo è un riscaldamento. In una chat reale, il messaggio di un
partecipante deve raggiungere tutti gli altri. Fermati un attimo su cosa
significa tecnicamente: la coroutine che serve una connessione deve
scrivere dentro le altre. Sembra una fonte di problemi? Guarda:

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Welcome, people in the room: {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

Trenta righe, e al loro interno confluiscono contemporaneamente tre fili
della prima serie. Non passarci sopra di corsa, ognuno merita una pausa.

Il primo: la stanza è solo un oggetto. Un ordinario `SplObjectStorage`,
condiviso tra tutte le coroutine, senza un singolo lock. Il capitolo sui
canali aveva promesso che all'interno di un thread questo è consentito,
ed eccolo qui in azione.

Il secondo: `finally`. Un partecipante può uscire con garbo, può sparire
insieme al Wi-Fi, oppure la coroutine può essere annullata dal server
stesso allo shutdown. Tre scenari, un `finally`, e un fantasma è
garantito di non restare nella stanza. La cancellazione cooperativa così
com'è.

Il terzo: scrivere nella connessione di qualcun altro è consentito da
qualsiasi coroutine. `send()` e `trySend()` sono sicuri per questo; il
server stesso si assicura che i frame di mittenti diversi non si mescolino
sul filo. La lettura, invece, è solo da uno. Una seconda `recv()`
concorrente sulla stessa connessione riceve un'eccezione, e giustamente:
un flusso di byte non ha una semantica sensata per due lettori.

## Un client lento non fermerà la stanza

Hai notato che il broadcast usa `trySend`, non `send`? Non è un refuso,
è una decisione, e vale la pena discuterla fino in fondo.

Cosa fa `send()` con un buffer pieno? Esatto, backpressure: mette la
coroutine in pausa finché il client non smaltisce l'arretrato. Per una
risposta personale, è proprio ciò che vuoi. Ora immaginalo in un ciclo
di broadcast. Un partecipante è entrato in un tunnel con il suo internet
mobile, il suo buffer è pieno, e... l'intera stanza aspetta. Cento
persone non ricevono messaggi perché uno ha una brutta ricezione.

`trySend()` non aspetta mai. O il messaggio viene accettato nel buffer e
`true`, oppure il buffer è pieno e `false`, il messaggio scartato. La
chat sacrifica deliberatamente i messaggi del ritardatario per non
punire tutti gli altri. Crudele? Per una chat, no: una riga persa in una
stanza non è una tragedia. Se nel tuo compito perdere non è consentito,
usa `send()` e rassegnati alle pause, oppure costruisci una coda per
ogni client. Entrambe le strategie sono oneste, la scelta è tua.

Come ultima risorsa c'è anche una salvaguardia: se `send()` è rimasto
appeso in attesa più a lungo del timeout di scrittura, lancia
`WebSocketBackpressureException`. Questo riguarda un client che tiene la
connessione aperta ma non legge affatto.

## Chi li ha fatti entrare in chat?

Al momento chiunque può entrare nella stanza. Se vuoi controllare alla
porta, dichiara un terzo parametro sull'handler, e il server passerà
l'oggetto dell'handshake:

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... la stanza ...
    }
);
```

`reject()` risponde con un ordinario errore HTTP invece di commutare il
protocollo. Attraverso lo stesso oggetto si negozia anche un
sottoprotocollo, se il client ne offre uno.

La chat è pronta: la stanza in memoria, broadcast istantaneo, i
ritardatari non rallentano nessuno. Ricorda la formula su cui tutto
poggia: "stato condiviso nella memoria del processo". Ricordala bene. Nel
prossimo capitolo accenderemo diversi worker per occupare tutti i core
della macchina, e quell'innocente formula sarà la prima a saltare in
aria.
