---
layout: tutorial
lang: it
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /it/tutors-server/08-workers.html
page_title: "Worker e HTTP/3"
description: "setWorkers(): i thread della prima serie sotto il cofano del server, il bootloader e HTTP/3 sulla stessa porta."
---

# Worker e HTTP/3

Apri un htop qualsiasi sul server sotto carico. Il nostro processo si sta
affannando, migliaia di richieste in volo... e su otto core, uno è
occupato. Sette inattivi. Fastidioso? Fastidioso.

Non c'è nulla di nuovo in questo, l'abbiamo trattato nel capitolo sui
thread: mentre i task aspettano sull'I/O, un core basta per tutti. Ma
sotto traffico reale il server non si limita ad aspettare. Il parsing
HTTP, gli handshake TLS, la serializzazione JSON, quelle sono
computazioni, e sbattono contro quell'unico singolo core.

La ricetta di quello stesso capitolo: dai thread alla computazione. Il
server la applica in una singola riga:

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` avvia N worker, ed è letteralmente `Async\ThreadPool`
del capitolo quattordici. Non un "meccanismo simile", ma proprio lo
stesso. Il che significa che conosci già anche le regole: ogni worker è
un thread separato del sistema operativo con il proprio ambiente PHP, il
proprio event loop, i propri pool. La configurazione e gli handler
vengono copiati in ciascun worker secondo le regole usuali per il
passaggio tra thread. `start()` nel genitore aspetta tutti quanti.

Resta una domanda: chi consegna le connessioni in arrivo ai worker? Ed
ecco la parte più bella. Nessuno. Ogni worker apre la stessa porta con il
flag `SO_REUSEPORT`, e da lì è il kernel Linux stesso a distribuire le
connessioni tra di loro. Nessun dispatcher, nessuna coda, nessun lock.
Otto server indipendenti nascosti dietro un'unica porta.

## Bootloader: riscaldare ogni worker

Nella prima serie ThreadPool aveva un bootloader, e lì sembrava una
comodità opzionale. Qui diventa la figura centrale. Ecco perché: tutto
ciò che nel primo capitolo facevamo "una volta, prima di `start()`" ora
deve avvenire in ogni worker. Ognuno ha la propria memoria, dopotutto.

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // il proprio PDO Pool in ciascun worker
        Router::compile();
    });
```

La closure viene eseguita una volta per worker, prima della prima
richiesta. Un'eccezione al suo interno arresta l'intero pool. Duro?
Corretto: un server con un worker mal riscaldato su otto è una macchina
che scarica errori a ogni ottavo client. Meglio che non parta affatto.

## La chat incontra i worker

E ora l'esplosione promessa. Nel capitolo precedente abbiamo costruito
una chat sulla formula "stato condiviso nella memoria del processo".
Rileggi la formula lentamente. Nella memoria. Del processo.

Quale degli otto?

Il kernel sparpaglia le connessioni come gli pare. Alice è finita nel
worker 3, Bob nel worker 5. Ogni worker ha la propria memoria, e quindi
la propria `$room`. Due stanze con lo stesso nome che non sapranno mai
l'una dell'altra. Alice scrive nel vuoto, Bob tace in un vuoto diverso.
Nessuna race, nessun errore, la chat ha semplicemente e silenziosamente
smesso di essere una chat.

Cosa fare? Le vie d'uscita standard sono queste. Per un sistema piccolo,
un onesto `setWorkers(1)`: un worker regge migliaia di connessioni
WebSocket senza problemi, dato che per lo più aspettano. Per uno grande,
sposta lo stato condiviso all'esterno, di solito in Redis pub/sub, e
lascia che i worker dialoghino attraverso di esso. Una regola da
ricordare: lo stato della richiesta vive nello scope della richiesta, lo
stato del processo nel worker, lo stato condiviso nello storage esterno.

## HTTP/3: gli stessi handler, un trasporto diverso

Visto che stiamo già scalando, portiamo lo stack al livello moderno. Su
HTTP/3 basta sapere tre cose. Funziona non su TCP ma su QUIC sopra UDP.
Stabilisce una connessione più velocemente e non lascia che un singolo
pacchetto perso blocchi tutti gli stream in una volta. Ed è obbligatorio
impararlo, perché i browser già lo preferiscono.

Sembra un grande cantiere? Guarda:

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP: HTTP/1.1 e HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP: HTTP/3
```

Una riga, `addHttp3Listener`. La stessa porta, e non c'è conflitto:
443/TCP ascolta per HTTP/1.1 e HTTP/2, mentre 443/UDP va a QUIC. Non ha
un flag TLS separato, perché secondo le specifiche QUIC non esiste senza
TLS; i certificati vengono presi dal server.

Come fanno i client a sapere dell'ingresso UDP? Da soli. A ogni risposta
su TCP il server aggiunge un header `Alt-Svc: h3=":443"`. Il browser lo
vede e invia le richieste successive su HTTP/3. Prima visita su HTTP/2,
poi QUIC, e nessuno ha configurato niente.

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

Sai cosa mi piace di più di questo capitolo? Ciò che non c'è. Abbiamo
acceso otto thread e la terza versione di HTTP, e non è cambiata una
singola riga negli handler. Il routing del capitolo due, l'SSE del
capitolo sei, la chat del capitolo sette, nessuno di loro è consapevole
che il mondo attorno è diventato multithread e ha iniziato a parlare
QUIC. Lo scaling si è spostato nella config, dove è giusto che stia.

Il server è diventato veloce. Il prossimo passo è renderlo
inaffondabile: cosa fare con il sovraccarico, con i client lenti, con il
deploy nel pieno del traffico. Un capitolo sulle brutte giornate.
