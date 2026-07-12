---
layout: tutorial
lang: it
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /it/tutors-server/01-first-server.html
page_title: "Il tuo primo server"
description: "Un server HTTP dentro PHP: HttpServer, HttpServerConfig e il tuo primo handler."
---

# Il tuo primo server

Ricordiamo come PHP di solito serve una richiesta. Nginx accetta la
connessione e la passa a PHP-FPM. FPM prende un processo libero. Il
processo si sveglia, carica le classi, apre una connessione al
database, assembla la risposta, la invia. E muore. Tutto ciò che è
riuscito a costruire, ogni connessione, ogni cache, tutti quei pool
splendidamente scaldati della prima serie, finisce nella spazzatura. Un
millisecondo dopo arriva la richiesta successiva e tutta la storia si
ripete da zero. Cento volte al secondo. Mille.

Nel frattempo, nella prima serie abbiamo costruito tutto un arsenale di
cose a cui una vita del genere è controindicata: un pool di connessioni
è utile quando vive a lungo, e un `Future` memoizzato non ha senso se
muore insieme al processo.

Quindi il piano per questa serie è semplice: eliminare gli
intermediari. `TrueAsync Server` è un'estensione che avvia un server
`HTTP` proprio dentro il processo `PHP`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` apre una porta, `addHttpHandler` registra una funzione
handler e `start()` avvia il ciclo degli eventi e non ritorna mai. Ogni
richiesta in arrivo esegue l'handler.

## Un handler è una coroutine

Ogni invocazione dell'handler viene eseguita nella propria coroutine
(`spawn`). Cosa significa in pratica? Facciamo un esperimento.
Aggiungiamo al server una rotta volutamente lenta:

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // cinque secondi di "pesante" lavoro di I/O
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

Ora apri due terminali. Nel primo, richiedi `/slow`. Rimane appeso, in
attesa dei suoi cinque secondi. Senza aspettarlo, richiedi `/` nel
secondo terminale:

```bash
$ curl http://localhost:8080/
fast
```

Istantaneamente.

Se hai letto la prima serie, hai già capito cosa è successo. La
coroutine `/slow` si è addormentata in `delay`, lo scheduler ha passato
il controllo altrove e il server ha servito con calma la seconda
richiesta. Sono gli stessi contatori "A" e "B" del primissimo capitolo,
solo che ora si chiamano richieste HTTP. Un thread. Un ciclo di eventi.
Migliaia di client concorrenti.

Ora immagina cosa farebbe quello stesso `/slow` al classico FPM. Cinque
secondi di sonno sono cinque secondi durante i quali un intero worker è
fuori uso. Una dozzina di richieste del genere e il pool di worker è
esaurito. L'intero sito resta fermo ad aspettare mentre qualcuno
finisce il suo pisolino.

## Un processo che non muore

La seconda conseguenza è più interessante della prima, anche se sembra
banale. `start()` non ritorna mai. Il che significa che tutto ciò che è
stato creato prima di essa vive quanto vive il server:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // memoizzazione dal capitolo sei

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // il pool è già caldo, la directory è già caricata
});

$server->start();
```

Il pool di connessioni si apre una volta. La directory delle regioni si
carica una volta. Le rotte si compilano una volta. Ricordi quanto
sforzo la prima serie ha dedicato agli strumenti per il riuso? Ecco il
punto in cui tutto trova finalmente casa. L'avvio a freddo non è
diventato più veloce. È svanito.

Per correttezza, la lunga vita ha un prezzo, ed è bene dirlo subito. Un
memory leak non viene più perdonato dalla morte del processo dopo la
richiesta. Una variabile globale non è più "per una sola richiesta", è
per sempre e per tutti. Non c'è bisogno di farsi prendere dal panico:
scope, pool e context della prima serie sono stati inventati
esattamente per questo, e i dettagli specifici del server li vedremo in
un capitolo a parte.

Per ora il nostro server ha un problema più semplice: risponde la
stessa cosa a tutto. `GET /profile/42`, `POST /profile/42/address`, un
refuso nell'URL, non fa alcuna differenza. Un vero `ProfileService`
dovrà imparare a leggere la richiesta. È di questo che ci occuperemo la
prossima volta.
