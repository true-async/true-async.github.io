---
layout: tutorial
lang: en
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /en/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unary and streaming, readMessage/writeMessage, trailers, and deadlines."
---

# gRPC

So far only browsers have talked to our server. But `ProfileService`
has other interlocutors too: `UserDirectory`, `GeoDirectory`, billing.
Services have long talked among themselves not over REST but over gRPC:
strict contracts, streaming in both directions, deadlines and error
codes out of the box.

Usually a separate server is spun up for gRPC on a separate port. Ask
yourself: why, actually? gRPC is a protocol over HTTP/2 and HTTP/3.
Over what's already listening for us. The server just needs to tell
such requests apart by the content-type `application/grpc` and hand
them to a separate handler. And that's exactly what it does.

## Contract First

A gRPC conversation begins not with code. It begins with a contract,
and that's perhaps the main cultural difference from REST. Let's
describe the profile service in `profile.proto`:

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

The protobuf compiler generates PHP classes from this, and the runtime
is installed with Composer:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Now the project has `Profile\GetProfileRequest` and `Profile\Profile`:
typed getters, setters, serialization. And protoc will generate exactly
the same classes for a client in Go, Java, or Python. That's the whole
point: one contract, any languages.

## Messages Instead of Bodies

How does a gRPC handler differ from an HTTP handler? In the unit of
communication. There we had a "request body" and a "response body," one
of each. Here it's a stream of messages in each direction:
`readMessage()` returns the bytes of the next incoming one or `null` at
the end, and `writeMessage()` sends an outgoing one. The server is
responsible for gRPC framing, lengths, and flags. The generated classes
are responsible for the contents:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // the request path names the contract method
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // bytes -> object

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // object -> bytes
});
```

Routing here is just the path: package, service, method. A client in
any language, calling `GetProfile`, sends a POST to
`/profile.ProfileService/GetProfile`. And the handler itself lives next
to the REST routes and sees the same warmed-up pool and request
context.

All four forms of gRPC come out of this same API and differ only in the
number of calls:

```php
// Unary: one message there, one back
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: one there, many back
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex: read and reply interleaved
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` puts the coroutine to sleep until the next message, and
`writeMessage()` replies right away, without waiting for the end of the
incoming stream. The same duplex as WebSocket, only with a contract and
by the standard.

## Passing Errors

gRPC has its own system of error codes, and it lives in a place that's
confusing at first. The response's HTTP status is always 200. Always.
The real result travels in the trailers, headers that HTTP/2 sends
after the body. We glimpsed them in the streaming chapter, and here's
their main consumer:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // a clean return: the server itself appends grpc-status: 0 (OK)
});
```

Crashes are handled too: an exception that flies out of the handler
turns into `grpc-status: 13` (INTERNAL), rather than a dropped
connection.

## Deadlines

Remember how many chapters of the first series we spent on the idea
that "any wait must have a limit"? Well, in gRPC that idea is elevated
to a protocol standard. The client passes its deadline right in the
request, via the `grpc-timeout` header, and the server hands it to the
handler:

```php
$deadline = $req->getGrpcTimeout(); // milliseconds or null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Think about how right this mechanic is. The client has two hundred
milliseconds of patience left? Then there's no point going to
`GeoDirectory` with a two-second timeout. The deadline is threaded
through all the internal waits, through all the services in the chain,
and the whole system respects the patience of the very first caller.

## The End of the Second Series

That's the whole route. Let's glance back once.

The fifteen chapters of the first series were building a vocabulary:
coroutines, cancellation, `Future`, channels, scope, groups, pools,
threads, context. Honestly, in places it might have felt like the
vocabulary was excessive. And then the second series came, and it
turned out the server is just a sentence composed of those same words.
Every request is a coroutine. The pool protects the database. Scope
cleans up after the request. Backpressure holds off overload. Threads
occupy the cores. And on top, static, SSE, WebSocket, and gRPC on one
port.

Note too what wasn't in either series: callbacks, `.then()` chains, the
keywords `async` and `await` on every other line, manual event loop
management. All the code is ordinary sequential PHP. It just stopped
waiting for nothing.

From here you're on your own. Take the service that's long been asking
for a rework, and start with a single handler. The class reference is
in the [server documentation](/en/docs/server/index.html), and the
internals are in the [architecture](/en/architecture/server.html). And
if something behaves differently from what these chapters promised, you
now know enough to file a good bug report.
