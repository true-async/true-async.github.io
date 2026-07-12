---
layout: tutorial
lang: de
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /de/tutors-laravel/03-sse-grpc.html
page_title: "SSE und gRPC mit Laravel"
description: "trueasync_response(), Sse und grpc_handlers: direkt aus einem Controller an der gepufferten Illuminate Response vorbeigreifen."
---

# SSE und gRPC mit Laravel

Der `TrueAsyncServer` innerhalb von `laravel-spawn` ist einfach gebaut:
er nimmt einen `HttpRequest` entgegen, baut daraus ein
`Illuminate\Http\Request`, lässt es durch `Kernel::handle()` laufen,
erhält eine `Illuminate\Http\Response`, puffert sie komplett in eine
`HttpResponse` und sendet sie. Eine Anfrage, eine Antwort, der gesamte
Inhalt auf einmal. Genau das, woran Laravel während seiner ganzen
Geschichte gewöhnt war.

Aber die zweite Serie auf dieser Website hatte einen Fortschrittsbalken
über `SSE` und `gRPC` auf demselben Port, und beide leben nicht nach der
Formel "eine Antwort", sondern nach der Formel "Strom von Nachrichten".
Eine gepufferte `Illuminate\Response` ist dafür nicht gebaut: sie hat
weder `sseEvent()` noch `writeMessage()`. Ein Controller braucht also
einen Weg, an die echte, rohe `HttpResponse` heranzukommen, am Puffer
vorbei.

## Eine rohe Response auf Abruf

`laravel-spawn` legt den `HttpRequest` und die `HttpResponse` der
aktuellen Anfrage in `request_context()`, bevor die Kontrolle an
Laravels Router übergeben wird, derselbe Trick, den Laravel selbst
benutzt, um `auth` und `session` dort abzulegen, schon im ersten Kapitel
gesehen. Du kannst sie mit zwei Funktionen abrufen:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Sobald ein Controller in die rohe Response geschrieben und sie selbst
geschlossen hat (`$res->end()`), wird der übliche
`Illuminate\Response`-Pfad nicht mehr benötigt: `TrueAsyncServer` prüft
`isClosed()`, bevor es puffert, und wenn die Antwort bereits manuell
gesendet wurde, fügt es nichts mehr hinzu. Der Controller muss weiterhin
etwas zurückgeben, Laravel verlangt das, aber niemanden interessiert
mehr, was in diesem Rückgabewert steht.

## SSE: ein Fortschrittsbalken innerhalb einer Laravel-Route

Jedes Mal über `trueasync_response()` nach `sseStart()`/`sseEvent()`/
`sseComment()` zu greifen ist unbequem, deshalb liefert das Paket einen
dünnen Wrapper mit:

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
            break; // der Tab wurde geschlossen
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Erkennst du diesen Code wieder? Es ist der Fortschrittsbalken aus Kapitel
sechs der Server-Serie, Wort für Wort, nur mit `$res->sseEvent()`
ausgetauscht gegen `Sse::event()`. Innerhalb der Route stehen dir
weiterhin `Auth::user()`, `session()`, `Eloquent` zur Verfügung, das ist
ein gewöhnlicher Laravel-Handler, er antwortet nur mit einem Strom statt
einmalig. Middleware, Autorisierung über
`Route::middleware('auth:sanctum')`, `current_context()` für Zustand pro
Anfrage aus dem ersten Kapitel, all das funktioniert wie gewohnt, weil
sich `Kernel::handle()` rund um diesen Code um keine einzige Zeile
geändert hat.

Ein Konfigurationsdetail hat nichts mit Laravel zu tun, sondern mit dem
Server selbst: ein langlebiger Strom sollte nicht durch das
Schreib-Timeout unterbrochen werden, das gewöhnliche Antworten
tatsächlich brauchen, deshalb schalten Dienste mit Strömen es global ab,
`ASYNC_WRITE_TIMEOUT=0` in `.env`, derselbe Hebel, der im
Produktionskapitel der Server-Serie benutzt wird.

## gRPC: ein Vertrag statt einer Route

Bei `gRPC` ist der Kompromiss härter. Das Protokoll spricht in
Protobuf-kodierten Nachrichten, die sich weder sinnvoll auf
`Illuminate\Http\Request` noch, noch weniger, auf `Response` abbilden
lassen. Eine gefälschte HTTP-Anfrage nur zu konstruieren, um sie durch
Laravels Routing und Middleware zu schleusen, wäre zwecklos: ein
gRPC-Client sendet weder Cookies noch ein CSRF-Token noch einen
Formular-Body. Also umgeht `gRPC` in `laravel-spawn` den `Kernel`
vollständig und nimmt einen separaten, über die Konfigurationsdatei
eingerichteten Pfad:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

Der Handler selbst wird über den Container aufgelöst (sodass gewöhnliche
Konstruktor-DI weiterhin funktioniert), und die Methodensignatur ist
dasselbe Paar roher Objekte, das schon in Kapitel zehn der Server-Serie
zu sehen war:

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
        // ein einfaches return: der Server hängt selbst grpc-status: 0 (OK) an
    }
}
```

`$this->users` kam über den Konstruktor herein, wie bei jedem
Laravel-Dienst: Container und DI sind weiterhin vollständig im Spiel,
obwohl Laravels Routing diesen Pfad überhaupt nie berührt hat. Fehler
wandern auf demselben Weg wie im nackten `TrueAsync Server`: über einen
`grpc-status`-Trailer, nicht über einen HTTP-Statuscode.

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

Eine aus einem Handler geworfene Exception wird von `laravel-spawn`
selbst in `grpc-status: 13` (`INTERNAL`) verwandelt, dasselbe Verhalten,
das der nackte Server hatte, jetzt nur im Adapter versteckt.

## Was hier echt ist und was nicht

Keiner der beiden Pfade ist eine Emulation oder ein Hack über Symfonys
`StreamedResponse`, beide sind direkter Zugriff auf dieselben
`HttpRequest`/`HttpResponse`-Primitive aus der Server-Serie, direkt aus
einer Laravel-Route heraus. Der Preis ist vorhersehbar: ein
SSE-Handler antwortet nicht über das vertraute
`return response()->json(...)`, er schreibt selbst und entscheidet
selbst, wann er die Verbindung schließt; ein gRPC-Handler sieht Laravels
Middleware oder Routing überhaupt nicht, nur den Container für DI. Es
gibt hier keine schwarze Magie, aber auch kein Vortäuschen: wenn du
einen echten Strom brauchst, musst du die gemütliche Welt der
gepufferten `Response` verlassen und dorthin gehen, wo der Server selbst
lebt.

Wir haben abgedeckt, was Laravel kann: gewöhnliche Anfragen, Ströme,
gRPC. Übrig bleibt, was Laravel nicht von allein kann und was in deinem
eigenen Code und dem anderer Leute genaue Prüfung verdient, bevor du es
nebenläufigen Coroutinen überlässt. Dorthin geht es im nächsten Kapitel.
