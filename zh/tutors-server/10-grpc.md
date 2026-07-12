---
layout: tutorial
lang: zh
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /zh/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler()：一元调用与流式调用、readMessage/writeMessage、trailers，以及 deadline。"
---

# gRPC

到目前为止，只有浏览器跟我们的服务器说过话。但 `ProfileService` 还有别的对话者：`UserDirectory`、`GeoDirectory`、计费系统。服务之间早就不用 REST 而用 gRPC 交谈了：严格的契约、双向流、开箱即用的 deadline 和错误码。

通常人们会为 gRPC 在一个单独的端口上另起一个服务器。问问你自己：其实何必呢？gRPC 是一个跑在 HTTP/2 和 HTTP/3 之上的协议。跑在已经在为我们监听的东西之上。服务器只需要通过 content-type `application/grpc` 把这类请求分辨出来，交给一个单独的处理器。而它做的正是这件事。

## 契约先行

一场 gRPC 对话不是从代码开始的。它从一份契约开始，而这也许是与 REST 最主要的文化差异。让我们在 `profile.proto` 里描述这个 profile 服务：

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

protobuf 编译器会由此生成 PHP 类，而运行时通过 Composer 安装：

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

现在项目里有了 `Profile\GetProfileRequest` 和 `Profile\Profile`：带类型的 getter、setter、序列化。而 protoc 会为 Go、Java 或 Python 的客户端生成一模一样的类。这就是全部要点：一份契约，任意语言。

## 用消息取代 body

一个 gRPC 处理器与一个 HTTP 处理器有何不同？在于通信的单位。那里我们有"请求 body"和"响应 body"，各一个。这里则是每个方向上的一串消息：`readMessage()` 返回下一条进来的消息的字节，或者在结束时返回 `null`，而 `writeMessage()` 发出一条出去的消息。gRPC 的分帧、长度和标志由服务器负责。内容由生成的类负责：

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // 请求路径命名了契约方法
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // 字节 -> 对象

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // 对象 -> 字节
});
```

这里的路由就只是路径：package、service、method。任何语言的客户端，在调用 `GetProfile` 时，都会向 `/profile.ProfileService/GetProfile` 发一个 POST。而处理器本身就住在 REST 路由旁边，看到的是同一个预热好的池和请求上下文。

gRPC 的全部四种形式都出自同一套 API，区别只在调用的次数：

```php
// 一元调用：一条消息过去，一条回来
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// 服务端流式：一条过去，多条回来
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// 全双工：读取与回复交错进行
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` 让协程睡去，直到下一条消息，而 `writeMessage()` 立刻回复，不必等到进来的流结束。和 WebSocket 一样的双工，只不过带着契约，并且遵循标准。

## 传递错误

gRPC 有它自己的一套错误码体系，而它住在一个初看令人困惑的地方。响应的 HTTP 状态永远是 200。永远。真正的结果走在 trailers 里，即 HTTP/2 在 body 之后才发送的那些头。我们在讲流的那一章瞥见过它们，而这里是它们的主要消费者：

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // 干净地 return：服务器自己会追加 grpc-status: 0 (OK)
});
```

崩溃也有处理：一个从处理器里飞出来的异常会变成 `grpc-status: 13`（INTERNAL），而不是一个被丢弃的连接。

## Deadline

还记得第一季里我们花了多少章来讲"任何等待都必须有一个上限"这个想法吗？在 gRPC 里，这个想法被提升成了协议标准。客户端把它的 deadline 直接放在请求里传过来，通过 `grpc-timeout` 头，服务器再把它交给处理器：

```php
$deadline = $req->getGrpcTimeout(); // 毫秒或 null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

想想这个机制有多正确。客户端只剩两百毫秒的耐心了？那就没必要带着两秒的超时去找 `GeoDirectory`。deadline 被贯穿到所有内部的等待里，穿过链条上的所有服务，整个系统都尊重最初那个调用者的耐心。

## 第二季完结

这就是全部路线了。让我们回望一次。

第一季的十五章一直在构建一套词汇：协程、取消、`Future`、通道、作用域、group、池、线程、上下文。老实说，某些地方也许让人觉得这套词汇过头了。然后第二季来了，结果发现，服务器不过是用那同一批词组成的一个句子。每个请求是一个协程。池保护数据库。作用域在请求之后清理。背压顶住过载。线程占满核心。而在这之上，静态文件、SSE、WebSocket 和 gRPC 在一个端口上。

也请留意两季里都没有的东西：回调、`.then()` 链、每隔一行就出现的 `async` 和 `await` 关键字、手动的事件循环管理。所有代码都是普通的顺序式 PHP。它只是不再为了无谓的东西而等待了。

从这里起就靠你自己了。挑一个早就该重做的服务，从一个处理器开始。类的参考在[服务器文档](/zh/docs/server/index.html)里，而内部机制在[架构](/zh/architecture/server.html)里。而如果有什么表现得和这些章节所承诺的不一样，你现在懂得足够多，能提交一份像样的 bug 报告了。
