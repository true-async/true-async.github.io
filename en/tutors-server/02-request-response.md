---
layout: tutorial
lang: en
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /en/tutors-server/02-request-response.html
page_title: "Request and Response"
description: "HttpRequest and HttpResponse: routing, json(), and errors via HttpException."
---

# Request and Response

The handler receives two objects. `HttpRequest` is everything the
client sent, and it's read-only. `HttpResponse` is everything that
goes back. Between them sits your code. Let's build a minimal profile
`API` on this trio, and along the way see what these objects can do.

## Parsing the Request

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, without query string

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

Much of the request is already parsed and available in a convenient
form:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', with a default value

// POST with a form: application/x-www-form-urlencoded or multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// headers, case-insensitive
$req->getHeader('authorization');    // 'Bearer eyJ...' or null

// raw body, for example JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` and `getPost()` understand the familiar PHP array
notation: `address[city]`, `photos[]`. Moving over from the old
`$_GET`/`$_POST` is almost word for word.

## Assembling the Response

An `API` needs `JSON`, and the response has a ready-made helper for it:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // status as the second argument
}
```

The other helpers follow the same spirit:

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Every method returns `$this`, so the response is assembled as a chain.
You don't need to finish it explicitly: the handler returned, the
response went out.

## Errors: HttpException

Now `updateAddress`. The profile may not exist. The address may not be
sent. Validation may fail. Do we write a `setStatusCode` with an early
`return` for each case? We could. Or we could do this:

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

The server understands `HttpException` without a translator: the
exception code becomes the status, the message becomes the response
body. No 500 with a stack trace leaking out. The class isn't final, so
build your own hierarchy and forget about magic numbers:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

And here I'll ask for a minute of your attention, because what follows
is my favorite detail of this chapter. Look at the class's ancestry:

`HttpException extends Async\AsyncCancellation`

That very same cancellation exception. From chapter two of the first
series. A coincidence? No. Think about what the server should do when
a client drops the connection mid-request: stop the handler coroutine.
And how do we stop coroutines? Cooperative cancellation. An HTTP error
and a coroutine cancellation turn out to be the same mechanism, just
seen from different sides.

From this kinship follows the old rule, familiar from the chapter on
cancellation: if you catch `HttpException` by accident, together with
`Throwable`, rethrow it. The server knows what to do with it. You
don't have to.

So the `API` responds by the rules and fails by the rules. But our
handlers are still suspiciously simple: one check, one query, one
response. What happens when they need to hit the database, the
`GeoDirectory`, and the cache inside, and preferably concurrently?
That's chapter three. There the first series finally fires on all
cylinders.
