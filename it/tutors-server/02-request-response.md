---
layout: tutorial
lang: it
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /it/tutors-server/02-request-response.html
page_title: "Richiesta e risposta"
description: "HttpRequest e HttpResponse: routing, json() ed errori tramite HttpException."
---

# Richiesta e risposta

L'handler riceve due oggetti. `HttpRequest` è tutto ciò che il client
ha inviato, ed è di sola lettura. `HttpResponse` è tutto ciò che torna
indietro. Tra i due sta il tuo codice. Costruiamo un'`API` minimale per
i profili su questo trio e, lungo il percorso, vediamo cosa possono
fare questi oggetti.

## Analizzare la richiesta

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, senza query string

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

Gran parte della richiesta è già analizzata e disponibile in una forma
comoda:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', con un valore di default

// POST con un form: application/x-www-form-urlencoded o multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// header, case-insensitive
$req->getHeader('authorization');    // 'Bearer eyJ...' oppure null

// body grezzo, per esempio JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` e `getPost()` capiscono la familiare notazione ad array di
PHP: `address[city]`, `photos[]`. Il passaggio dai vecchi
`$_GET`/`$_POST` è quasi parola per parola.

## Assemblare la risposta

Un'`API` ha bisogno di `JSON`, e la risposta ha un helper pronto per
questo:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // lo status come secondo argomento
}
```

Gli altri helper seguono lo stesso spirito:

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Ogni metodo restituisce `$this`, quindi la risposta si assembla come
una catena. Non serve chiuderla esplicitamente: l'handler è ritornato,
la risposta è partita.

## Errori: HttpException

Ora `updateAddress`. Il profilo potrebbe non esistere. L'indirizzo
potrebbe non essere inviato. La validazione potrebbe fallire.
Scriviamo un `setStatusCode` con un `return` anticipato per ogni caso?
Potremmo. Oppure potremmo fare così:

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

Il server capisce `HttpException` senza bisogno di traduttore: il codice
dell'eccezione diventa lo status, il messaggio diventa il body della
risposta. Nessun 500 con uno stack trace che trapela. La classe non è
final, quindi costruisci la tua gerarchia e dimenticati i numeri
magici:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

E qui ti chiederò un minuto di attenzione, perché quel che segue è il
mio dettaglio preferito di questo capitolo. Guarda l'albero genealogico
della classe:

`HttpException extends Async\AsyncCancellation`

Proprio quella stessa eccezione di cancellazione. Dal capitolo due
della prima serie. Una coincidenza? No. Pensa a cosa dovrebbe fare il
server quando un client interrompe la connessione a metà richiesta:
fermare la coroutine dell'handler. E come fermiamo le coroutine?
Cancellazione cooperativa. Un errore HTTP e una cancellazione di
coroutine si rivelano essere lo stesso meccanismo, visto solo da lati
diversi.

Da questa parentela discende la vecchia regola, familiare dal capitolo
sulla cancellazione: se catturi `HttpException` per sbaglio, insieme a
`Throwable`, rilanciala. Il server sa cosa farne. Tu no.

Così l'`API` risponde secondo le regole e fallisce secondo le regole. Ma
i nostri handler sono ancora sospettosamente semplici: un controllo, una
query, una risposta. Cosa succede quando al loro interno devono
raggiungere il database, la `GeoDirectory` e la cache, preferibilmente
in modo concorrente? Questo è il capitolo tre. Lì la prima serie
finalmente gira a pieni giri.
