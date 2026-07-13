---
layout: tutorial
lang: zh
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /zh/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "为什么协程不能共享单个 PDO，以及内置的连接池如何透明地解决这个问题。"
---

# PDO Pool

导入几乎完成了：worker 通过 `GeoDirectory` 核对地址。剩下的
就只是把核对过的地址保存到数据库里。听起来很简单：

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        try {
            while (true) {
                $address = $queue->recv();
                checkAddress($address);
                saveAddress($pdo, $address);
            }
        } catch (ChannelException) {
        }
    });
}
```

一个 `PDO` 对象被十个协程共享。在讲通道的那一章里我们说过，
在单个线程内不会发生数据竞争，那么这应该没问题，对吧？

不对。这对内存来说是成立的。但数据库连接不是内存，它是套接字之上的
一个协议：请求、响应、请求、响应，严格按顺序进行。每一个数据库查询
都是一个等待点，协程会在那里睡去，控制权转交给另一个协程。
而那另一个协程会把它自己的查询写进同一个套接字里：

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// 等待点：worker 1 睡去，worker 2 醒来

// Worker 2
$pdo->beginTransaction(); // 在同一个连接上！
$pdo->exec("UPDATE ...");
$pdo->commit(); // 既提交了自己的事务，也提交了别人的
```

响应被搞乱了，事务互相提交了对方的工作。竞态又回来了，
只不过现在它们活在连接里，而不是内存里。

好吧，那就给每个协程它自己的连接？

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // 它自己的连接
    // ...
});
```

对十个 worker 来说没问题。但想象一下，不是一个导入任务，而是一台
服务器，每个请求都会创建一个协程。一千个协程意味着一千个 TCP 连接。
MySQL 默认允许 151 个，PostgreSQL 允许 100 个。而为了几毫秒的工作
就去打开一个连接根本就很昂贵：与数据库的握手可能比查询本身还要久。

听起来耳熟吗？讲通道的那一章有过同样的岔路口：向 `GeoDirectory`
发起十万个连接，还是用一个队列给十个。

## 池：一个反向的队列

解决方案叫做连接池（connection pool）：预先打开 N 个连接，
在协程工作期间把它们交给协程。恰好，我们已经知道如何构建一个了。
池就是一个存放连接的通道：

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// 在协程内部：
$pdo = $pool->recv();   // 取一个连接
saveAddress($pdo, $address);
$pool->send($pdo);      // 把它还回去
```

空闲的连接待在缓冲区里。如果它们全都在忙，`recv` 就会让协程睡去，
直到有人还回一个连接。就是上一章里那个同样的同步，只不过队列里
存的是资源而不是任务。

这个方案能用，但它有一个软肋：你必须记着把连接还回去，
无论发生了什么，包括异常或取消。然后还有事务、断开的连接、
重连的问题。对于 PDO，这一切都已经被照料好了，就在核心里。

## PDO Pool

池被内建进了 `PDO` 本身，通过构造函数的属性来开启：

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

从外面看，什么都没变：那个最开头的例子，一个 `$pdo` 交给十个
worker，现在是正确的了。`$pdo` 对象不再是一个连接，而是池的一个
门面（facade）。当一个协程运行它的第一个查询时，池会交给它一个
专属的连接，那个协程的所有查询都会走这个连接。协程一旦完成，
连接就回到池里，为下一个协程准备就绪。

没有手动的 `recv` 和 `send`：获取和归还会自行发生，在恰当的时刻，
无论事情最终如何收场。代码看起来就像普通的同步 PHP 配上普通的
PDO，而这正是当初的全部意图。

## 事务

事务是属于一个连接的状态，所以池会对它特殊处理：当一个事务开着的
时候，连接会被钉死在它的协程上，不会回到池里：

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // 只有到现在，连接才能回到池里
});
```

如果一个协程没有调用 `commit` 就结束了呢？回想一下讲 Scope 的那一章：
一个 worker 可能恰好在事务进行到一半时被取消，而这是个正常的场景，
不是灾难。在归还连接之前，池会自动运行一个 `ROLLBACK`。
一个未完成的事务不会泄漏到下一个协程里，也不会在数据库里赖着不走。

## 当连接断开时

一次导入可能运行一个小时。在一个小时里，数据库可能重启，
网络可能闪断，或者 DBA 可能杀掉一个会话。在经典的 PHP 里，
脚本会直接崩溃，但一个长时间运行的应用需要有能力继续跑下去。

池会在连接被归还时检查它们：一个坏掉的连接会被销毁，
而不是交给下一个协程。而且如果一个查询因为连接断开而失败，
只需在同一个 `$pdo` 上简单地重试它就足够了，池会交给协程
一个新鲜的连接：

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // 池已经换上了一个新连接
}
```

不需要编写重连逻辑，不需要重新创建 `PDO` 对象。只管重试查询，
其余的一切池会照料。

到头来，代码运行起来就好像每个协程都有它自己的数据库连接一样。
而实际上只有十个连接，池不断地把它们从一只手传到另一只手，
盯着事务，并丢弃掉那些死掉的。但所有这些后厨活儿从外面一点都
看不出来，而这正是主要的好处：我们只管写普通的、带 PDO 的代码。

顺便说一句，我们的 worker 仍然是半瞎着干活的：它们核对地址并保存
地址，但没人在统计有多少地址结果是坏的，或者是哪些。我们如何把
结果从协程里取回来，并方便地把它们收集起来？这就是我们将在下一章里
着手解决的问题。
