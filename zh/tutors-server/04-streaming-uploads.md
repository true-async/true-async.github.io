---
layout: tutorial
lang: zh
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /zh/tutors-server/04-streaming-uploads.html
page_title: "字节流"
description: "send() 与 sendable()、流式传输响应体、文件上传，以及 sendFile()。"
---

# 字节流

到目前为止，我们的响应都是又小又完整的，用 `setBody()` 和 `json()` 构
建。对一个 API 来说，这正是你想要的。

但 `ProfileService` 揽下了另一个量级的任务。财务部门想要一整年的导出数
据，那可是几百 MB 的 `CSV`。用户上传导入文件，那些也都不小。让我们粗略
算一笔账：五十个并发请求，每个都在内存里攥着一百 MB……不，我们别再往下
算了，结局已经很清楚了。

我们需要学会分片地处理响应体和请求体。两个方向都要。

## 分片的响应：send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

第一次 `send()` 会固定住状态码和响应头，此后各个分块一旦就绪就会发往客
户端：在 HTTP/1.1 里是分块传输（chunked），在 HTTP/2 里是 DATA 帧。任何
时刻，内存里只存活着一行数据。一条通往客户端的字节流就此成形！

现在来个考验你机智的问题。假设我们从数据库里以每秒一 Gb 的速度生成数据
行。而客户端正在一列火车上用移动网络下载。多出来的那些行去哪儿了？

如果你读过讲通道（channel）的那一章，你已经有了答案：背压
（backpressure）。当流的缓冲区被填满时，`send()` 会挂起处理器协程。客户
端清空了队列，协程就醒过来，生成继续。整个导出会自我调整到最窄那个瓶颈
的速度，而且请注意，我们没有为此写一行代码！

不过，等待一个慢客户端，并不总是你想要的：

```php
if (!$res->sendable()) {
    // send() 现在就会阻塞。就说我们不等了。
}
```

`send()` 总是安全的。`sendable()` 只是给你一个警告：下一次调用会睡过去。
接下来怎么做，取决于你。

> 还有一种针对慢客户端的流行攻击方式：它们打开一个连接却不去读取，直到
> 服务器阻塞为止。
> 对一个协程服务器来说，这没那么可怕，因为每个协程的成本远远低于一个进
> 程或一个线程。
> 尽管如此，协程总数的上限仍是一个重要的参数，其他那些额外的安全选项也
> 一样重要！
>

## 分片的请求体：readBody()

反过来的情况。一个用户上传一个 GB 大小的 CSV，而默认情况下，处理器是在
整个请求体都被读完之后才被调用的。“GB”这个词和“放进内存”这几个字出现在
同一句话里，正是我们说好要避免的。

我们打开流式模式：

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

在 `TrueAsync` 服务器里，处理器在收到请求头之后就立即启动，足够早。事实
上，协程的工作恰好是与从套接字接收数据同步进行的。这就是为什么在这里处
理数据流是浑然天成的。

如果你运行五十个并发的 20 MiB 上传，峰值内存本来会是 1170 MiB，现在变成
了 197。吞吐量增长了将近三倍，因为处理不必等上传结束就已经开始了。对于
一行配置来说，成绩不错。

## 带文件的表单：UploadedFile

带文件的经典 HTML 表单是更简单的情形，为它你不需要打开任何东西。
Multipart 总是以流的方式解析，处理器接收到的是现成的对象：

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

任何见过 PSR-7 的人都会有宾至如归的感觉：`moveTo()`、`getSize()`、
`getClientFilename()`。一个字段里的多个文件（`photos[]`）通过
`getFiles()` 以数组形式送达。

## 提供文件：sendFile()

剩下的就是提供现成的文件了。这是唯一一件你不该用 `fopen` 和 `send()` 手
工拼凑的事情，原因如下：

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

在这一次调用背后，藏着大约三十年的 HTTP 历史。从扩展名推断出的
`Content-Type`。`ETag` 和 `Last-Modified`，好让重复的请求只需一个简短的
304 就能了事。当客户端在中途断开时，通过 `Range` 实现的断点续传。如果客
户端支持 gzip，就提供预先压缩好的邻居文件（`report.csv.gz`）。而这一切
都伴随着从磁盘的异步读取，不会拖住事件循环。手工写这些，意味着至少会忘
掉其中一半。

只有一条规则：`sendFile()` 之后响应就被封存了。再往里写任何东西都不行，
你会得到一个异常。

现在我们既能接收也能提供一个 GB 大小的文件了。但请注意我们是把这一切通
过一个 PHP 处理器提供给谁的：受访问权限限制的报表，藏在一次性链接背后的
文件。那 CSS 呢？还有 logo 呢？它们对所有人都是一样的，为它们每一个都启
动一个协程，感觉有点别扭。那是下一章的内容，而且会很短。
