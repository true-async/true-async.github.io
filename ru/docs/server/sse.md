---
layout: docs
lang: ru
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /ru/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): готовые хелперы text/event-stream поверх HTTP/1.1, HTTP/2 и HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) даёт простой способ передавать браузеру поток текстовых событий по
обычному HTTP-соединению, только в одну сторону: от сервера к браузеру. В отличие от WebSocket,
здесь не нужен ни отдельный протокол, ни Upgrade-соединение: сервер просто держит ответ открытым
и дописывает в него новые события по мере готовности. На стороне браузера события принимает
встроенный API `EventSource`, без дополнительных библиотек.

`HttpResponse` даёт четыре метода для `text/event-stream`: `sseStart()`, `sseEvent()`,
`sseComment()` и `sseRetry()`. Это тонкий слой форматирования поверх той же потоковой
[`send()`-пайплайна](/ru/docs/server/streaming.html), поэтому один и тот же обработчик без
изменений работает над HTTP/1.1, HTTP/2 и HTTP/3, а протокол выбирает клиент.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // долгоживущий стрим: без дедлайна на запись

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // необязательно: первый sseEvent()/sseComment() стартует стрим сам
    $res->sseRetry(3000);      // подсказка браузеру: переподключаться через 3с после обрыва
    $res->sseComment('stream open');   // heartbeat, держит прокси от идle-таймаута

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // клиент отвалился, незачем ждать зря
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Браузер:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Переводит ответ в режим SSE и фиксирует заголовки: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform` и `X-Accel-Buffering: no` (последний нужен, чтобы nginx
не буферизовал ответ; без него события зависают за буфером прокси, пока он не заполнится).
Ответ также помечается как несжимаемый: буферизующий gzip-стрим убил бы задержку доставки.

Вызов необязателен: первый `sseEvent()`/`sseComment()` стартует стрим сам. Но сам по себе
`sseStart()` **не** отправляет статус-строку и заголовки на провод, коммит ленивый и происходит
на первом реальном событии. Чтобы открыть стрим сразу (например, разбудить `onopen` браузера до
того, как появится первое реальное событие), отправьте пустой `sseComment()`: это и стартует
стрим, и сразу коммитит заголовки.

Бросает `HttpServerInvalidArgumentException`, если обработчик уже выставил свой `Content-Type`,
и `HttpServerRuntimeException`, если ответ уже стримит, закрыт или занят под `sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Форматирует и отправляет одно SSE-событие, при необходимости стартуя стрим. Многострочный
`$data` бьётся по `\n` / `\r\n` / `\r` и уходит как несколько полей `data:` (WHATWG §9.2).
`$event`, `$id` и `$retry` попадают в запись только если не `null`. Запись завершается пустой
строкой, чтобы браузер сразу диспатчил событие.

- `$event` и `$id` не должны содержать `\r`/`\n` (иначе парсер прочтёт их как разделитель
  поля/записи), а `$id` не должен содержать NUL (по WHATWG NUL заставляет парсер игнорировать
  весь id целиком): такие нарушения бросают `HttpServerInvalidArgumentException`.
- `$retry` должен быть неотрицательным.
- Пустая строка `$data === ''` тоже валидна, она диспатчит пустой `MessageEvent`.
- Все четыре аргумента, равные `null`, дают no-op. `EventSource`-парсер молча пропускает событие
  без `data` и без `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Отправляет комментарий (запись, начинающаяся с `:`). Браузеры игнорируют комментарии, но они
держат соединение живым сквозь idle-таймауты промежуточных прокси (например, nginx
`proxy_read_timeout`, по умолчанию 60с). Вызывайте периодически как heartbeat. Канонический
payload: пустая строка, на проводе она превращается в `:\n\n`. `$text` не должен содержать
`\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Отправляет директиву `retry:`, указывающую браузеру, сколько миллисекунд ждать перед
переподключением после обрыва стрима. Синтаксический сахар для `sseEvent(retry: $milliseconds)`
без payload.

## Backpressure: `sendable()`

Как и `send()`, все SSE-методы приостанавливают корутину обработчика только под настоящим
backpressure, то есть когда промежуточный буфер стрима заполнен. Проверка `sendable()`
неблокирующая и рекомендательная: `false` означает, что следующий вызов приостановится, ответ
уже закрыт или это не тот тип ответа, который поддерживает стриминг. Удобно, чтобы не ждать
медленного клиента и заняться чем-то ещё вместо `delay()`.

## См. также

- [`HttpResponse::sseStart()`](/ru/docs/reference/server/http-response.html#ssestart) и другие
  SSE-методы в справочнике
- [Streaming](/ru/docs/server/streaming.html): низкоуровневый `send()`/`sendable()`, на котором
  построен SSE
- [Примеры](/ru/docs/server/examples.html#sse-server-sent-events)
