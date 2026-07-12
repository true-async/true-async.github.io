---
layout: tutorial
lang: zh
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /zh/tutors-server/03-concurrency-inside.html
page_title: "请求内部的并发"
description: "处理器中的 TaskGroup、负载之下的 PDO Pool，以及 request_context()。"
---

# 请求内部的并发

在上一章里，`showProfile` 用一行代码就加载了个人资料，而我诚实地假装它
背后什么都没有。是时候坦白了。它背后有三个数据来源：来自数据库的用户数
据、来自数据库的订单、来自外部 API 的评价。三趟独立的取数之旅。

一个熟悉的问题？当然。这就是第一部第十章的逐字重现，而解决方案原封不动
地搬了过来，一个字都不用改：

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

这三个请求并发地发出去。整个页面在最慢的那个来源所需的时间里就组装完成，
而不是三者时间之和。这里有超时，有一损俱损，有 `CompositeException`。

在这里，重要的是要体会到一件事：服务器并没有引入任何属于它自己的并发规
则。一条都没有。处理器就是一个普通的协程，而在它内部，你已经掌握的一切
都照常运作。服务器只不过打开了一扇门，让 HTTP 请求走进你已经熟知的那个
世界。

## 真实负载下的连接池

还记得第一部的第九章吗？十个导入 worker，一个 `PDO` 对象，纠缠不清的事
务，一片混乱。那时候它是一个用十个协程演示的教学例子。好吧，把十个忘掉
吧。

在一个服务器里，并发的数据库使用者有多少，取决于当前正在处理的请求有多
少。二十个。五百个。流量涌进来多少就有多少，而这个数字你控制不了。唯一
能救你的东西，你已经知道了：

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

其机制和以前一样：每个协程在它的那一刻独占一个连接，事务被固定住，而一
个断掉的连接会被悄悄换成一个新的。但 `POOL_MAX` 现在有了一份新工作。它
现在成了风暴和数据库之间的保险丝：一千个并发请求会排成一队去争抢十六个
连接。你会同意，这总比一千个连接同一时间涌向 PostgreSQL 要好。

## 这是谁的请求？

第一部的第十五章结束时，留下了一个问题：把“当前”的东西存到哪里，用户、
区域设置、请求标识符。那时我们把答案建立在 context 之上。服务器把这个故
事讲到了结尾，而且讲得很漂亮。

每个处理器都运行在它自己的 scope 里。而请求的 scope 有一个在该请求的整
个协程树里共享的 context：

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... 哪怕深入到十层调用之后 ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` 可能是从处理器里调用的。从它 spawn 出来的一个协程里调用的。从
一个仓库里的一个服务里的一个 `TaskGroup` 里的一个协程里调用的。这都无所
谓：只要我们还在这个请求内部，`request_context()` 处处都是同一个。而正
在与我们的请求交错处理的那个邻居请求呢？它有它自己的。三百个并发请求，
三百个互不相干的 `request_id`，零个全局变量。

与 `current_context()` 的区别现在可以用一句话来概括：那一个针对的是单个
协程，这一个针对的是整个请求。

## Scope 在请求结束后善后清理

还有最后一个后果，最不显眼、也最有价值的一个。因为处理器活在一个 scope
里，所以第一部整个第八章的内容都会自动地应用到请求上，你这边不需要任何
动作。

Spawn 了一个协程却忘了 await 它？请求结束，scope 就清理掉。客户端在中途
断开了连接？服务器取消请求的 scope，取消协作式地抵达每一个子协程，而每
一个 `finally` 都会释放它各自的资源。还记得结构化并发要求了多少纪律吗？
在这里它不再是纪律。它现在成了平台的一个属性：任何请求协程的生命周期都
被请求本身所约束。到此为止。

服务器的隐形部分到这里就讲完了。接下来登场的是字节，而且是大量的字节：
客户端上传一个 GB 大小的文件，而我们回传一个两 GB 的报表。我们要把这一
切都放到哪里，才不会惊动 OOM killer？下一章讲的正是这个。
