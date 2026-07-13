---
layout: tutorial
lang: en
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /en/tutors-laravel/03-sse-grpc.html
page_title: "SSE and gRPC with Laravel"
description: "trueasync_response(), Sse, and grpc_handlers: reaching past the buffered Illuminate Response right from a controller."
---

# SSE and gRPC with Laravel

The `TrueAsyncServer` inside `laravel-spawn` is built simply: it
accepts an `HttpRequest`, assembles an `Illuminate\Http\Request` from
it, runs it through `Kernel::handle()`, gets an
`Illuminate\Http\Response`, buffers it whole into an `HttpResponse`,
and sends it. One request, one response, all the content at once.
Exactly what Laravel has been used to throughout its entire history.

But the second series on this site had a progress bar over `SSE` and
`gRPC` on the same port, and both live not by the "one response"
formula but by the "stream of messages" formula. A buffered
`Illuminate\Response` isn't built for them: it has neither
`sseEvent()` nor `writeMessage()`. So a controller needs a way to
reach the real, raw `HttpResponse`, bypassing the buffer.

## A Raw Response On Demand

`laravel-spawn` places the current request's `HttpRequest` and
`HttpResponse` into `request_context()` before handing control over
to Laravel's router, the same trick Laravel itself uses to put `auth`
and `session` there, back in the first chapter. You can retrieve them
with two functions:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Once a controller has written to the raw response and closed it
itself (`$res->end()`), the usual `Illuminate\Response` path is no
longer needed: `TrueAsyncServer` checks `isClosed()` before buffering,
and if the response has already been sent manually, it doesn't add
anything on top. The controller is still required to return
something, Laravel demands it, but nobody cares about the content of
that return value anymore.

## SSE: A Progress Bar Inside a Laravel Route

Reaching for `sseStart()`/`sseEvent()`/`sseComment()` through
`trueasync_response()` every time is inconvenient, so the package
ships a thin wrapper:

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
            break; // the tab was closed
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Recognize this code? It's the progress bar from chapter six of the
server series, word for word, with `$res->sseEvent()` swapped for
`Sse::event()`. Inside the route you still have `Auth::user()`,
`session()`, `Eloquent`, all available, this is an ordinary Laravel
handler, it just answers with a stream instead of once. Middleware,
authorization through `Route::middleware('auth:sanctum')`,
`current_context()` for per-request state from the first chapter, all
of it works as usual, because `Kernel::handle()` around this code
hasn't changed by a single line.

One configuration detail isn't about Laravel at all, it's about the
server itself: a long-lived stream shouldn't be cut off by the write
timeout that ordinary responses actually need, so services with
streams turn it off globally, `ASYNC_WRITE_TIMEOUT=0` in `.env`, the
same lever used in the production chapter of the server series.

## gRPC: A Contract Instead Of A Route

With `gRPC`, the compromise is harsher. The protocol talks in
protobuf-encoded messages, which have no meaningful mapping onto
either `Illuminate\Http\Request` or, even less so, `Response`.
Fabricating a fake HTTP request just to push it through Laravel's
routing and middleware would be pointless: a gRPC client sends
neither cookies, nor a CSRF token, nor a form body. So `gRPC` in
`laravel-spawn` bypasses the `Kernel` entirely, taking a separate path
configured through the config file:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

The handler itself is resolved through the container (so ordinary
constructor DI still works), and the method signature is the same
pair of raw objects seen back in chapter ten of the server series:

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
        // a plain return: the server appends grpc-status: 0 (OK) itself
    }
}
```

`$this->users` arrived through the constructor, like in any Laravel
service: the container and DI are still fully in play, even though
Laravel's routing never touched this path at all. Errors travel the
same way they do in plain `TrueAsync Server`: through a `grpc-status`
trailer, not an HTTP status code.

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

An exception thrown out of a handler is turned by `laravel-spawn`
itself into `grpc-status: 13` (`INTERNAL`), the same behavior the bare
server had, just now tucked away inside the adapter.

## What's Real Here And What Isn't

Neither path is an emulation or a hack layered over Symfony's
`StreamedResponse`, both are direct access to the very same
`HttpRequest`/`HttpResponse` primitives from the server series, right
from under a Laravel route. The cost is predictable: an SSE handler
doesn't answer through the familiar `return response()->json(...)`,
it writes itself and decides for itself when to close the connection;
a gRPC handler doesn't see Laravel's middleware or routing at all,
only the container for DI. There's no black magic here, but no
pretending either, if you need a real stream, you have to step out of
the cozy world of the buffered `Response` into the place where the
server itself lives.

We've covered what Laravel can do: ordinary requests, streams, gRPC.
What's left is what Laravel can't do on its own, and what deserves
close scrutiny in your own code and other people's before you hand it
over to concurrent coroutines. That's where we head in the next
chapter.
