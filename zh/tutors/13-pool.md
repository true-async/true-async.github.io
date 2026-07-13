---
layout: tutorial
lang: zh
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /zh/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool：一个带健康检查和熔断器的通用资源池。"
---

# Pool

在 PDO Pool 那一章里，我们用六行代码勾勒了一个基于通道的池，并随即承认它对于真实世界来说过于天真：你必须记得
无论结果如何都要归还资源、识别损坏的连接，并替换掉死掉的那些。对于 PDO，核心替我们做了这一切。但 `checkAddress`
通过 HTTP 与 `GeoDirectory` 通信，而在每次请求时都对它打开一个全新的连接同样会很浪费。而且明天还会有用于缓存
的 Redis 和用于邮件的 SMTP。

我们当然不会为每一种资源都手工搭建一个通道池。没错，这里有一个现成的原语，正是那个在 PDO Pool 底层默默工作的
家伙：`Async\Pool`。

## 工厂与析构器

池并不知道它持有的是哪种资源。你要告诉它两件事：如何创建一个资源，以及如何销毁一个资源：

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` 意味着预先打开两个连接，这样最初的那些协程就不必苦等一次握手。`max: 10` 意味着无论有多少协程来请求，
池都绝不会创建超过十个连接。这就是那个熟悉的并发上限，只不过现在它绑定在资源本身上，而不是绑定在工作者的数量上。

接下来就是我们已经用通道亲手搭建过的那个循环：

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` 交出一个空闲的资源。如果没有空闲的、且尚未达到上限，工厂就会创建一个新的。如果已经达到上限，协程就会
进入休眠，直到别人调用 `release`：这和在一个空通道上调用 `recv` 的机制相同。请注意那个 `finally`：无论结果如何，
包括异常或取消，资源都会被归还。而这恰恰是我们手工搭建的池过去会栽跟头的地方。

你也可以像往常那样带上限地等待：

```php
$conn = $geo->acquire(timeout: 3000); // 如果 3 秒内没等到，就抛出 TimeoutException
```

## 资源会死亡

一个在池里躺了半小时的连接可能已经悄无声息地死了：服务器在超时后关闭了它，网络抖动了一下。我们在 PDO 那一章
已经见过这会导致什么：下一个协程会不知从哪儿冒出来一个神秘的错误。池在三条战线上与此对抗：

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — 池每隔三十秒自行巡视它的空闲资源，检查它们的脉搏。死掉的会被销毁并替换成新的。
- **`beforeAcquire`** — 交出资源前的最后一道检查。如果它失败了，资源会被销毁，协程会拿到下一个。
- **`beforeRelease`** — 归还时的一道检查。协程可能在请求进行到一半时弄坏了连接；这样的资源不会被放回池中。

协程对这些幕后工作一无所知：它们请求一个资源，然后拿到一个可用的。健康管理是在构造函数里声明式地表达出来的，
而不是作为一堆 `if` 涂抹得代码里到处都是。

## 熔断器

现在设想 `GeoDirectory` 彻底宕机了。全部十个连接都死了，每个协程都尽职地等完一个超时，创建一个新连接，然后
再次等待。应用把全部精力都花在轰炸一个已经宕掉的服务上，并在此过程中妨碍它重新恢复。

电气工程为这种情形发明了一个修复办法：一个断路器，在故障排除之前一直断开电路。这个模式就以它命名，叫做熔断器
（circuit breaker），并且内建在池中。池有三种状态：`ACTIVE`，一切正常；`INACTIVE`，服务已被宣告不可用，
`acquire` 会立即失败，不带任何超时；`RECOVERING`，谨慎地检查服务是否已恢复生机。

你可以手动切换状态，也可以把决策交给一个策略：

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // 一有机会就尝试恢复
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

池自身会把每个资源的每一次成功和每一次失败都上报给策略，并通过 `shouldRecover` 询问是否到了谨慎检查服务是否
已恢复的时候。连续五次失败，电路就断开：协程得到的是一次快速失败，而不是漫长的超时折磨，而 `GeoDirectory`
则不再挨那些毫无意义的打击，得以安心恢复。

回头看，`Pool` 所做的正是我们在第九章用一个通道手工搭建的东西，再加上那些你实在不想手工搭建的部分：保证归还、
健康检查、一个熔断器。`PDO Pool` 就是同一个原语，只是塞在了 `PDO` 门面之后。而对于其余的一切，HTTP 客户端、
Redis、套接字，以及广义上的重型对象，就有了 `Async\Pool`。

到这一步，我们的武器库看起来颇为可观：协程、通道、作用域、任务组、池。但这一切都运行在单个操作系统线程里，
共享单个 CPU 核心。只要任务在等待 I/O，这就不是任何人的问题。但如果工作不受制于等待，而是受制于计算呢？
那时整幅图景就变了，而这正是下一章要讲的。
