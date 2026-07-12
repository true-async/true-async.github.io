---
layout: tutorial
lang: it
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /it/tutors-laravel/03-sse-grpc.html
page_title: "SSE e gRPC con Laravel"
description: "trueasync_response(), Sse e grpc_handlers: come uscire dal buffered Illuminate Response direttamente da un controller."
---

# SSE e gRPC con Laravel

Il `TrueAsyncServer` dentro `laravel-spawn` è costruito in modo
semplice: accetta una `HttpRequest`, assembla da essa una
`Illuminate\Http\Request`, la fa passare attraverso `Kernel::handle()`,
ottiene una `Illuminate\Http\Response`, la bufferizza per intero in una
`HttpResponse` e la invia. Una richiesta, una risposta, tutto il
contenuto in una volta. Esattamente ciò a cui Laravel è abituato in
tutta la sua storia.

Ma la seconda serie su questo sito aveva una barra di avanzamento via
`SSE` e `gRPC` sulla stessa porta, ed entrambi non vivono secondo la
formula "una risposta" ma secondo la formula "flusso di messaggi". Una
`Illuminate\Response` bufferizzata non è costruita per loro: non ha né
`sseEvent()` né `writeMessage()`. Quindi un controller ha bisogno di un
modo per raggiungere la vera `HttpResponse` grezza, bypassando il
buffer.

## Una risposta grezza su richiesta

`laravel-spawn` mette la `HttpRequest` e la `HttpResponse` della
richiesta corrente dentro `request_context()` prima di passare il
controllo al router di Laravel, lo stesso trucco che Laravel stesso
usa per mettere lì `auth` e `session`, già visto nel primo capitolo.
Puoi recuperarle con due funzioni:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Una volta che un controller ha scritto sulla risposta grezza e l'ha
chiusa da solo (`$res->end()`), il consueto percorso
`Illuminate\Response` non serve più: `TrueAsyncServer` verifica
`isClosed()` prima di bufferizzare, e se la risposta è già stata
inviata manualmente, non aggiunge nulla sopra. Il controller deve
comunque restituire qualcosa, Laravel lo richiede, ma a nessuno importa
più del contenuto di quel valore di ritorno.

## SSE: una barra di avanzamento dentro una route Laravel

Raggiungere `sseStart()`/`sseEvent()`/`sseComment()` tramite
`trueasync_response()` ogni volta è scomodo, quindi il pacchetto
fornisce un sottile wrapper:

```php
use Spawn\Laravel\Sse\Sse;
use function Async\delay;

Route::get('/import/progress', function () {
    Sse::start(retryMs: 3000);

    $import = currentImport();

    while (!$import->isFinished()) {
        Sse::event(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!Sse::connected()) {
            break; // la scheda è stata chiusa
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Riconosci questo codice? È la barra di avanzamento del capitolo sei
della serie sul server, parola per parola, con `$res->sseEvent()`
sostituito da `Sse::event()`. Dentro la route hai ancora
`Auth::user()`, `session()`, `Eloquent`, tutto disponibile, questo è un
normale handler Laravel, risponde semplicemente con uno stream invece
che una volta sola. Middleware, autorizzazione tramite
`Route::middleware('auth:sanctum')`, `current_context()` per lo stato
per-richiesta del primo capitolo, tutto funziona come al solito, perché
`Kernel::handle()` intorno a questo codice non è cambiato di una riga.

Un dettaglio di configurazione non riguarda affatto Laravel, riguarda
il server stesso: uno stream a lunga durata non dovrebbe essere
interrotto dal write timeout di cui le risposte ordinarie hanno
effettivamente bisogno, quindi i servizi con stream lo disattivano
globalmente, `ASYNC_WRITE_TIMEOUT=0` in `.env`, la stessa leva usata
nel capitolo sulla produzione della serie sul server.

## gRPC: un contratto invece di una route

Con `gRPC`, il compromesso è più duro. Il protocollo parla in messaggi
codificati in protobuf, che non hanno una mappatura significativa né
su `Illuminate\Http\Request` né, ancor meno, su `Response`. Fabbricare
una finta richiesta HTTP solo per farla passare attraverso il routing
e il middleware di Laravel sarebbe inutile: un client gRPC non invia né
cookie, né un token CSRF, né un corpo form. Quindi `gRPC` in
`laravel-spawn` bypassa il `Kernel` interamente, prendendo un percorso
separato configurato tramite il file di configurazione:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

L'handler stesso viene risolto tramite il container (quindi la normale
DI via costruttore funziona ancora), e la firma del metodo è la stessa
coppia di oggetti grezzi vista nel capitolo dieci della serie sul
server:

```php
namespace App\Grpc;

use Profile\GetProfileRequest;
use Profile\Profile;
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

class ProfileServiceHandler
{
    public function __construct(private readonly UserRepository $users) {}

    public function getProfile(HttpRequest $req, HttpResponse $res): void
    {
        $getProfile = new GetProfileRequest();
        $getProfile->mergeFromString($req->readMessage());

        $user = $this->users->find($getProfile->getUserId());

        $profile = (new Profile())
            ->setId($user->id)
            ->setName($user->name)
            ->setRegion($user->region);

        $res->writeMessage($profile->serializeToString());
        // un semplice return: il server aggiunge da solo grpc-status: 0 (OK)
    }
}
```

`$this->users` è arrivato tramite il costruttore, come in qualsiasi
servizio Laravel: il container e la DI sono ancora pienamente in
gioco, anche se il routing di Laravel non ha mai toccato questo
percorso. Gli errori viaggiano nello stesso modo in cui viaggiano nel
semplice `TrueAsync Server`: tramite un trailer `grpc-status`, non un
codice di stato HTTP.

```php
public function getProfile(HttpRequest $req, HttpResponse $res): void
{
    if (!$this->authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        return;
    }

    // ...
}
```

Un'eccezione lanciata fuori da un handler viene trasformata da
`laravel-spawn` stesso in `grpc-status: 13` (`INTERNAL`), lo stesso
comportamento che aveva il server nudo, solo ora nascosto dentro
l'adattatore.

## Cosa è reale qui e cosa non lo è

Nessuno dei due percorsi è un'emulazione o un trucco costruito sopra
lo `StreamedResponse` di Symfony, entrambi sono accesso diretto agli
stessi primitivi `HttpRequest`/`HttpResponse` della serie sul server,
proprio da sotto una route Laravel. Il costo è prevedibile: un handler
SSE non risponde tramite il familiare `return response()->json(...)`,
scrive da solo e decide da solo quando chiudere la connessione; un
handler gRPC non vede affatto il middleware o il routing di Laravel,
solo il container per la DI. Non c'è magia nera qui, ma nemmeno finzioni,
se hai bisogno di uno stream reale devi uscire dal comodo mondo della
`Response` bufferizzata verso il luogo dove vive il server stesso.

Abbiamo coperto cosa Laravel può fare: richieste ordinarie, stream,
gRPC. Ciò che resta è ciò che Laravel non può fare da solo, e che
merita un attento esame nel tuo codice e in quello degli altri prima di
consegnarlo alle coroutine concorrenti. È lì che ci dirigiamo nel
prossimo capitolo.
