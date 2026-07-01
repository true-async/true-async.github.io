---
layout: docs
lang: uk
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /uk/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): готові хелпери text/event-stream поверх HTTP/1.1, HTTP/2 і HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) дає простий спосіб передавати браузеру потік текстових подій по
звичайному HTTP-з'єднанню, тільки в один бік: від сервера до браузера. На відміну від WebSocket,
тут не потрібен ні окремий протокол, ні Upgrade-з'єднання: сервер просто тримає відповідь
відкритою і дописує в неї нові події по мірі готовності. На боці браузера події приймає вбудований
API `EventSource`, без додаткових бібліотек.

`HttpResponse` дає чотири методи для `text/event-stream`: `sseStart()`, `sseEvent()`,
`sseComment()` і `sseRetry()`. Це тонкий шар форматування поверх того самого потокового
[`send()`-пайплайна](/uk/docs/server/streaming.html), тому той самий обробник без змін працює над
HTTP/1.1, HTTP/2 і HTTP/3, а протокол вибирає клієнт.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // довгоживучий стрім: без дедлайну на запис

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // необов'язково: перший sseEvent()/sseComment() стартує стрім сам
    $res->sseRetry(3000);      // підказка браузеру: перепідключатися через 3с після обриву
    $res->sseComment('stream open');   // heartbeat, тримає проксі від idle-таймауту

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // клієнт відвалився, немає сенсу чекати даремно
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

Переводить відповідь у режим SSE і фіксує заголовки: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform` і `X-Accel-Buffering: no` (останній потрібен, щоб nginx не
буферизував відповідь; без нього події зависають за буфером проксі, поки він не заповниться).
Відповідь також позначається як нестислива: буферизувальний gzip-стрім вбив би затримку доставки.

Виклик необов'язковий: перший `sseEvent()`/`sseComment()` стартує стрім сам. Але сам по собі
`sseStart()` **не** надсилає статус-рядок і заголовки на провід, коміт лінивий і відбувається на
першій реальній події. Щоб відкрити стрім одразу (наприклад, розбудити `onopen` браузера ще до
того, як з'явиться перша реальна подія), надішліть порожній `sseComment()`: це і стартує стрім, і
одразу комітить заголовки.

Кидає `HttpServerInvalidArgumentException`, якщо обробник уже виставив свій `Content-Type`, і
`HttpServerRuntimeException`, якщо відповідь уже стрімить, закрита або зайнята під `sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Форматує і надсилає одну SSE-подію, за потреби стартуючи стрім. Багаторядковий `$data` розбивається
за `\n` / `\r\n` / `\r` і йде як кілька полів `data:` (WHATWG §9.2). `$event`, `$id` і `$retry`
потрапляють у запис лише якщо не `null`. Запис завершується порожнім рядком, щоб браузер одразу
диспетчеризував подію.

- `$event` і `$id` не повинні містити `\r`/`\n` (інакше парсер прочитає їх як роздільник
  поля/запису), а `$id` не повинен містити NUL (за WHATWG NUL змушує парсер проігнорувати весь id
  цілком): такі порушення кидають `HttpServerInvalidArgumentException`.
- `$retry` має бути невід'ємним.
- Порожній рядок `$data === ''` теж валідний, він диспетчеризує порожній `MessageEvent`.
- Усі чотири аргументи, що дорівнюють `null`, дають no-op. Парсер `EventSource` мовчки пропускає
  подію без `data` і без `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Надсилає коментар (запис, що починається з `:`). Браузери ігнорують коментарі, але вони тримають
з'єднання живим крізь idle-таймаути проміжних проксі (наприклад, nginx `proxy_read_timeout`, за
замовчуванням 60с). Викликайте періодично як heartbeat. Канонічний payload: порожній рядок, на
проводі він перетворюється на `:\n\n`. `$text` не повинен містити `\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Надсилає директиву `retry:`, що вказує браузеру, скільки мілісекунд чекати перед перепідключенням
після обриву стріму. Синтаксичний цукор для `sseEvent(retry: $milliseconds)` без payload.

## Backpressure: `sendable()`

Як і `send()`, усі SSE-методи призупиняють корутину обробника лише під справжнім backpressure, тобто
коли проміжний буфер стріму заповнений. Перевірка `sendable()` неблокувальна і рекомендаційна:
`false` означає, що наступний виклик призупиниться, відповідь уже закрита або це не той тип
відповіді, який підтримує стрімінг. Зручно, щоб не чекати повільного клієнта, а зайнятися чимось
іншим замість `delay()`.

## Див. також

- [`HttpResponse::sseStart()`](/uk/docs/reference/server/http-response.html#ssestart) та інші
  SSE-методи в довіднику
- [Стрімінг](/uk/docs/server/streaming.html): низькорівневий `send()`/`sendable()`, на якому
  побудовано SSE
- [Приклади](/uk/docs/server/examples.html#sse-server-sent-events)
