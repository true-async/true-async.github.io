---
layout: tutorial
lang: zh
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /zh/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE：向浏览器推送的事件流、导入进度，以及通过 sseComment() 实现的心跳。"
---

# Server-Sent Events

于是地址导入现在从页面上的一个按钮开始。用户点击了按钮，文件发了出去，处理开始了。它大约要运行十分钟。在这整段时间里用户看到的是什么？

没错，一个旋转的转圈图标。转十分钟。没有一丝生命迹象。大约到第三分钟，用户会认定它已经卡死，刷新页面，然后第二次启动导入。我们需要一个进度条。

经典的做法是轮询：浏览器每秒访问一次 `/import/progress`，服务器回复一个数字。这管用吗？管用。但算一算：十分钟内六百个请求，每个都带着请求头，都要走完整个处理周期，而每个请求的负载只是一个数字。我们更想要的其实是相反的模式：浏览器只连接一次，从此以后由服务器自己在数字变化时把它发过来。

这正是 `SSE`（`Server-Sent Events`）所做的事。没有新协议。只是一个普通的 `HTTP` 响应，服务器不关闭它，而是持续往里追加事件。在浏览器这边，它们由内置的 `EventSource` 接收，无需任何库。

## 把进度送到浏览器

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... 路由 ... */ }

    $import = currentImport(); // 就是第一季里的那个 ImportService

    $res->sseStart();
    $res->sseRetry(3000); // 如果流断开，浏览器会在 3 秒后重连

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // 标签页被关闭了，没人可画进度
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

而在浏览器里：

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

仔细看看处理器的结构。一个循环。取一次读数。`delay(1000)`。想起什么了吗？这就是最开头那一章里的进度协程，一字不差。只有最后一行变了：不再是把 `echo` 打到终端，而是用 `sseEvent()` 写进一个打开的响应。十五章之后，进度条到达了浏览器，而代码几乎没变。而且，和当时一样，进度对导入一无所知，导入对进度也一无所知。

底层同样没有魔法：SSE 的这些方法只是对第四章的 `send()` 做了一层薄薄的格式化封装。由此白得两份礼物。背压：一个缓慢的标签页不会吃光服务器的内存。以及协议无关性：同一个处理器在 `HTTP/1.1`、`HTTP/2` 和 `HTTP/3` 上都能工作，由浏览器来选择。

## 长时间的沉默与心跳

一个 `SSE` 连接会存活数分钟乃至数小时。长寿，一如既往，有它自己的毛病。这里有两个。

第一个：写超时。默认情况下，服务器会限制一个响应发送允许花费的时长，这是对的。但一个 SSE 响应是永远"正在发送"的，这就是它的本性。对于带流的服务，你要把这个限制关掉：

```php
$config->setWriteTimeout(0);
```

第二个毛病更微妙。假设导入长时间停滞：它在计算某个很重的东西，没有事件发出。对我们来说这是一次暂停，但对服务器和浏览器之间某个代理来说，这是一个该被杀掉的死连接。而它确实会杀掉它，nginx 这方面的默认值是六十秒。

治疗方法简单得可笑：

```php
$res->sseComment(); // 线路上是：":\n\n"
```

一条注释。一个浏览器会默默忽略的事件，但它会穿过线路，让每一个中间环节都相信连接还活着。在暂停期间按定时器发送它，流就能熬过任何沉默。

## 断开与恢复

移动网络闪了一下，流断了。怎么办？什么都不用做。真的：`EventSource` 会自己恢复连接，在等待 `sseRetry()` 设定的间隔之后。

唯一值得帮它一把的地方，是不要让它从一张白纸重新开始。给事件编号：

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

重连时，浏览器会发送一个 `Last-Event-ID` 请求头，带着它收到的最后一个编号，处理器就从那个点继续：

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

投递、重连、补上错过的内容。一个诚实的通知通道，而这一切都跑在最最普通的 HTTP 之上。

只有一点保留：这个通道是单向的。服务器说，浏览器听。对于一个进度条来说这堪称理想。但对于一个双方都要写字的客服聊天呢？做聊天你需要更硬核的东西。
