---
layout: tutorial
lang: en
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /en/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket: the recv loop, a chat room, send from other coroutines, and trySend against slow clients."
---

# WebSocket

In a support chat, both sides write. The user asks a question, the
operator answers, and neither waits for the other: messages go both
ways whenever they're written.

Can we assemble such a chat from tools we already know? Downward, from
the server to the browser, SSE will carry it, we've been able to do
that since yesterday's chapter. And upward? Upward we'd have to send a
separate POST for each of the user's lines. A new request, headers, a
response, a disconnect. And so on for every "thanks, that helped." It
would work, but not particularly well.

For a two-way conversation there's a separate protocol, WebSocket.

It's built surprisingly modestly. The client sends an ordinary HTTP
request with an `Upgrade` header: a proposal to switch to another
protocol. The server agrees: `101 Switching Protocols`. That's it,
HTTP is over. Over the same TCP connection, messages now travel in both
directions, without requests and without responses.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

The server takes the handshake entirely upon itself: the handler is
called once the connection is already switched, and it receives a
ready-made object. The model is familiar: one connection, one
coroutine. `WebSocket` implements `Iterator`, and it's the iterator
that puts the coroutine to sleep until the next message. The client
left, the loop ended, the server closed the connection itself with code
`1000 Normal`. And ordinary HTTP handlers keep working alongside, on
the same port.

## A Chat Room

Echo is a warm-up. In a real chat, one participant's message must reach
all the others. Pause for a second on what that means technically: the
coroutine serving one connection must write into others. Sounds like a
source of problems? Look:

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

Thirty lines, and inside them three threads from the first series come
together at once. Don't rush past, each one deserves a pause.

The first: the room is just an object. An ordinary `SplObjectStorage`,
shared across all coroutines, without a single lock. The chapter on
channels promised that within one thread this is allowed, and here it
is in action.

The second: `finally`. A participant may leave gracefully, may vanish
along with the Wi-Fi, or the coroutine may be cancelled by the server
itself on shutdown. Three scenarios, one `finally`, and a ghost is
guaranteed not to linger in the room. Cooperative cancellation as it
is.

The third: writing into someone else's connection is allowed from any
coroutine. `send()` and `trySend()` are safe for this; the server
itself makes sure that frames from different senders don't get mixed on
the wire. Reading, however, is only from one. A second concurrent
`recv()` on the same connection gets an exception, and rightly so: a
byte stream has no meaningful semantics for two readers.

## A Slow Client Won't Stop the Room

Did you notice that the broadcast uses `trySend`, not `send`? That's
not a typo, it's a decision, and it's worth talking through.

What does `send()` do on a full buffer? Right, backpressure: it puts
the coroutine to sleep until the client clears the backlog. For a
personal reply, that's just what you want. Now picture it in a
broadcast loop. One participant drove into a tunnel with their mobile
internet, their buffer is full, and... the whole room waits. A hundred
people get no messages because one has poor reception.

`trySend()` never waits. Either the message is accepted into the buffer
and `true`, or the buffer is full and `false`, the message dropped. The
chat deliberately sacrifices the laggard's messages so as not to punish
everyone. Cruel? For a chat, no: a missed line in a room is no tragedy.
If losing is not allowed in your task, use `send()` and put up with the
pauses, or build a queue per client. Both strategies are honest, the
choice is yours.

As a last resort there's a safeguard too: if `send()` has been hanging
in wait longer than the write timeout, it throws
`WebSocketBackpressureException`. This is about a client that holds the
connection open but doesn't read at all.

## Rooms, Without the Bookkeeping

The `SplObjectStorage` worked, but count what it cost us: a shared
object, a broadcast loop, and a `finally` to sweep out the ghosts. All
so that a line typed by one person reaches the others. It's such a
common wish that the server grants it directly. A connection
**subscribes** to a name; a message **published** to that name reaches
everyone subscribed. The same chat, without the bookkeeping:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

The storage is gone, and with it the loop and the `finally`.
`subscribe()` puts this connection into the room, `publish()` sends a
line to everyone in it, and a connection that closes leaves its rooms on
its own. `publish()` keeps the same bargain `trySend()` just made: a
peer whose buffer is backed up drops the line rather than stalling the
room, and it never blocks the sender.

The name is not just a label, it's an MQTT-style filter. Levels are
separated by `/`, `+` matches one level and `#` the rest. Subscribe to
`chat/+/typing` and you hear the typing signal from every room at once;
`subscriberCount("chat/general")` tells you how many are listening. And
one more thing, quietly important, that we'll cash in next chapter: a
topic isn't tied to one connection or even one array in memory. Hold on
to that.

## Who Let Them Into the Chat?

Right now anyone can enter the room. If you want to check at the door,
declare a third parameter on the handler, and the server will pass the
handshake object:

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... the room ...
    }
);
```

`reject()` answers with an ordinary HTTP error instead of switching the
protocol. Through the same object a subprotocol is negotiated too, if
the client offers any.

The chat is ready: the room in memory, instant broadcast, laggards slow
no one down. Remember the formula it all rests on: "shared state in the
process's memory." Remember it well. In the next chapter we'll turn on
several workers to occupy all the machine's cores, and that innocent
formula will be the first to blow up.
