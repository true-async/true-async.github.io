---
layout: tutorial
lang: en
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /en/tutors-server/04-streaming-uploads.html
page_title: "Byte Streams"
description: "send() and sendable(), streaming the body, file uploads, and sendFile()."
---

# Byte Streams

Until now our responses have been small and whole, built with
`setBody()` and `json()`. For an API that's exactly what you want.

But `ProfileService` has picked up tasks of a different caliber.
Accounting wants a year's export, and that's hundreds of megabytes of
`CSV`. Users upload import files, and those aren't small either. Let's
do the rough math: fifty concurrent requests, each holding a hundred
megabytes in memory... no, let's not count further, it's already clear
how that ends.

We need to learn to work with bodies in parts. In both directions.

## The Response in Parts: send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

The first `send()` fixes the status and headers, after which chunks go
to the client as they become ready: chunked in HTTP/1.1, DATA frames
in HTTP/2. At any moment a single row lives in memory. A stream of
bytes to the client takes shape!

Now a question to test your wits. We generate rows from the database
at, say, a gigabit per second. And the client is downloading over
mobile internet on a train. Where do the extra rows go?

If you read the chapter on channels, you already have the answer:
backpressure. When the stream buffer fills up, `send()` suspends the
handler coroutine. The client cleared the queue, the coroutine woke
up, generation continued. The export tunes itself to the speed of the
narrowest bottleneck, and note, we didn't write a single line for it!

Waiting for a slow client, though, isn't always what you want:

```php
if (!$res->sendable()) {
    // send() will block right now. Say that we won't wait.
}
```

`send()` is always safe. `sendable()` only warns you: the next call
will go to sleep. What to do next is up to you.

> There's still a popular type of attack with slow clients: they open
> a connection and don't read, until the server blocks.
> For a coroutine server this is less frightening, since each coroutine
> costs far less than a process or a thread.
> Still, the overall coroutine limit is an important parameter, as are
> the other extra security options!
>

## The Request Body in Parts: readBody()

The reverse situation. A user uploads a gigabyte CSV, and by default
the handler is called once the entire body has been read. The word
"gigabyte" and the words "into memory" in one sentence are exactly
what we agreed to avoid.

We turn on streaming mode:

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

In the `TrueAsync` server the handler starts right after the headers,
early enough. In fact, the coroutine's work happens precisely in step
with receiving data from the socket. That's why working with the data
stream here is a natural fit.

If you run fifty concurrent 20 MiB uploads, peak memory would have been
1170 MiB and became 197. Throughput grew almost threefold, because
processing begins without waiting for the upload to finish. Not bad
for one line of configuration.

## Forms With Files: UploadedFile

The classic HTML form with a file is an easier case, and for it you
don't need to turn anything on. Multipart is always parsed as a
stream, and the handler receives ready-made objects:

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

Anyone who's seen PSR-7 feels at home: `moveTo()`, `getSize()`,
`getClientFilename()`. Several files in one field (`photos[]`) come as
an array via `getFiles()`.

## Serving Files: sendFile()

That leaves serving ready-made files. This is the one thing you should
not assemble by hand from `fopen` and `send()`, and here's why:

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

Behind that single call hides some thirty years of HTTP history.
`Content-Type` from the extension. `ETag` and `Last-Modified`, so a
repeat request gets away with a short 304. Resumed downloads via
`Range` when the client dropped in the middle. Serving a pre-compressed
neighbor (`report.csv.gz`) if the client understands gzip. And all of
it with asynchronous reads from disk, without holding up the event
loop. Writing this by hand means forgetting at least half of it.

One rule: after `sendFile()` the response is sealed, writing anything
more into it won't work, you'll get an exception.

We can now both accept and serve a gigabyte file. But note who we
serve all this to through a PHP handler: reports gated by access
rights, files behind one-time links. And CSS? And the logo? They're
the same for everyone, and spinning up a coroutine for each of them
feels a bit awkward. That's the next chapter, and it'll be short.
