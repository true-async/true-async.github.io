---
layout: tutorial
lang: de
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /de/tutors-server/02-request-response.html
page_title: "Anfrage und Antwort"
description: "HttpRequest und HttpResponse: Routing, json() und Fehler über HttpException."
---

# Anfrage und Antwort

Der Handler erhält zwei Objekte. `HttpRequest` ist alles, was der
Client gesendet hat, und es ist schreibgeschützt. `HttpResponse` ist
alles, was zurückgeht. Dazwischen sitzt dein Code. Bauen wir auf
diesem Trio eine minimale Profil-`API`, und sehen wir dabei, was diese
Objekte können.

## Die Anfrage auswerten

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, ohne Query-String

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

Ein Großteil der Anfrage ist bereits geparst und in bequemer Form
verfügbar:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', mit einem Standardwert

// POST mit einem Formular: application/x-www-form-urlencoded oder multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// Header, unabhängig von Groß- und Kleinschreibung
$req->getHeader('authorization');    // 'Bearer eyJ...' oder null

// Roher Body, zum Beispiel JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` und `getPost()` verstehen die vertraute
PHP-Array-Notation: `address[city]`, `photos[]`. Der Umstieg vom alten
`$_GET`/`$_POST` gelingt fast wortwörtlich.

## Die Antwort zusammenbauen

Eine `API` braucht `JSON`, und die Antwort hat dafür einen fertigen
Helfer:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // Status als zweites Argument
}
```

Die übrigen Helfer folgen demselben Geist:

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Jede Methode gibt `$this` zurück, sodass die Antwort als Kette
zusammengebaut wird. Du musst sie nicht explizit abschließen: Der
Handler kehrte zurück, die Antwort ging hinaus.

## Fehler: HttpException

Jetzt `updateAddress`. Das Profil existiert möglicherweise nicht. Die
Adresse wird möglicherweise nicht gesendet. Die Validierung schlägt
möglicherweise fehl. Schreiben wir für jeden Fall ein `setStatusCode`
mit einem frühen `return`? Könnten wir. Oder wir machen es so:

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

Der Server versteht `HttpException` ohne Übersetzer: Der
Exception-Code wird zum Status, die Nachricht zum Body der Antwort.
Kein 500 mit einem nach außen dringenden Stacktrace. Die Klasse ist
nicht final, also baue deine eigene Hierarchie und vergiss magische
Zahlen:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

Und hier bitte ich um eine Minute deiner Aufmerksamkeit, denn was nun
folgt, ist mein Lieblingsdetail dieses Kapitels. Sieh dir die
Abstammung der Klasse an:

`HttpException extends Async\AsyncCancellation`

Genau jene Cancellation-Exception. Aus dem zweiten Kapitel der ersten
Serie. Ein Zufall? Nein. Überlege, was der Server tun soll, wenn ein
Client die Verbindung mitten in der Anfrage abbricht: die
Handler-Koroutine anhalten. Und wie halten wir Koroutinen an?
Kooperative Cancellation. Ein HTTP-Fehler und eine
Koroutinen-Cancellation entpuppen sich als derselbe Mechanismus, nur
von verschiedenen Seiten betrachtet.

Aus dieser Verwandtschaft folgt die alte Regel, vertraut aus dem
Kapitel über Cancellation: Wenn du `HttpException` versehentlich
zusammen mit `Throwable` fängst, wirf sie erneut. Der Server weiß, was
damit zu tun ist. Du nicht.

So antwortet die `API` nach den Regeln und scheitert nach den Regeln.
Aber unsere Handler sind noch verdächtig einfach: eine Prüfung, eine
Abfrage, eine Antwort. Was passiert, wenn sie darin die Datenbank, das
`GeoDirectory` und den Cache ansprechen müssen, und das am besten
nebenläufig? Das ist Kapitel drei. Dort läuft die erste Serie endlich
auf allen Zylindern.
