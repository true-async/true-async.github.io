---
layout: docs
lang: zh
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /zh/docs/server/sse.html
page_title: "TrueAsync Server：Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry()：开箱即用的 text/event-stream 助手方法，覆盖 HTTP/1.1、HTTP/2 和 HTTP/3。"
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE（Server-Sent Events）是一种通过普通 HTTP 连接向浏览器推送文本事件的简单方式，方向单一：
只从服务器流向浏览器。与 WebSocket 不同，它不需要单独的协议，也不需要 Upgrade 握手：
服务器只需保持响应打开，并在新事件就绪时不断追加。浏览器通过内置的 `EventSource` API
消费这些事件，不需要任何额外的库。

`HttpResponse` 为 `text/event-stream` 提供了四个方法：`sseStart()`、`sseEvent()`、
`sseComment()` 和 `sseRetry()`。这只是构建在同一个
[`send()` 管线](/zh/docs/server/streaming.html)之上的一层薄薄的格式化封装，因此同一个处理程序
在 HTTP/1.1、HTTP/2 和 HTTP/3 上无需修改即可工作，协议由客户端选择。

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // 长连接流：不设写超时

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // 可选：第一次 sseEvent()/sseComment() 也会启动流
    $res->sseRetry(3000);      // 提示浏览器在断线后 3 秒重连
    $res->sseComment('stream open');   // 心跳，防止代理把连接空闲超时断开

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // 客户端已断开，没必要再等
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

浏览器端：

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

将响应切换到 SSE 模式并锁定头部：`Content-Type: text/event-stream`、
`Cache-Control: no-cache, no-transform`，以及 `X-Accel-Buffering: no`（最后这一项告诉
nginx 不要缓冲响应；没有它，事件会在代理缓冲区填满之前一直卡住）。响应同时被标记为不可压缩：
带缓冲的 gzip 流会破坏实时投递的意义。

这次调用是可选的：第一次 `sseEvent()`/`sseComment()` 也会自行启动流。但 `sseStart()`
本身**不会**把状态行和头部刷到线路上，提交是惰性的，发生在第一个真正的事件时。
要立刻打开流（例如，在真正的事件就绪之前先解除浏览器 `onopen` 的阻塞），可以发送一个空的
`sseComment()`：它既会启动流，也会立刻提交头部。

如果处理程序已经自行设置了 `Content-Type`，会抛出 `HttpServerInvalidArgumentException`；
如果响应已经在流式传输、已关闭，或正忙于 `sendFile()`，则抛出 `HttpServerRuntimeException`。

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

格式化并发送一个 SSE 事件，如有需要会启动流。多行的 `$data` 会按 `\n` / `\r\n` / `\r`
拆分，并作为多个 `data:` 字段发送（WHATWG §9.2）。`$event`、`$id` 和 `$retry` 仅在非
`null` 时才会包含在记录中。记录以空行结束，这样浏览器会立刻派发该事件。

- `$event` 和 `$id` 不能包含 `\r`/`\n`（否则解析器会把它们当成字段/记录分隔符），
  `$id` 也不能包含 NUL（按 WHATWG 规范，NUL 会导致解析器忽略整个 id）：违反会抛出
  `HttpServerInvalidArgumentException`。
- `$retry` 必须是非负数。
- 空字符串 `$data === ''` 也是合法值，会派发一个空的 `MessageEvent`。
- 四个参数全部为 `null` 时是空操作。`EventSource` 解析器会静默跳过既没有 `data`
  也没有 `retry` 的事件。

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

发送一行注释（以 `:` 开头的记录）。浏览器会忽略注释，但它们能让连接在中间代理的空闲超时
（nginx 的 `proxy_read_timeout`，默认 60 秒）之下保持存活。可以周期性调用它作为心跳。
标准做法是传空字符串，在线路上会变成 `:\n\n`。`$text` 不能包含 `\r`/`\n`。

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

发送一个 `retry:` 指令，告诉浏览器在流断开后要等多少毫秒才重连。相当于不带数据、只调用
`sseEvent(retry: $milliseconds)` 的语法糖。

## Backpressure：`sendable()`

和 `send()` 一样，每个 SSE 方法只会在真正出现 backpressure（也就是流的中间缓冲区已满）时
挂起处理程序协程。`sendable()` 检查是非阻塞的、建议性的：返回 `false` 意味着下一次调用会挂起、
响应已经关闭，或者这种响应类型根本不支持流式传输。当还有其他工作可做时，用它可以避免白等
一个慢客户端。

## 也可参考

- [`HttpResponse::sseStart()`](/zh/docs/reference/server/http-response.html#ssestart)
  以及参考文档中的其他 SSE 方法
- [流式传输](/zh/docs/server/streaming.html)：SSE 所依赖的底层 `send()`/`sendable()`
- [示例](/zh/docs/server/examples.html#sse-server-sent-events)
