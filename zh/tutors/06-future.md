---
layout: tutorial
lang: zh
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /zh/tutors/06-future.html
page_title: "Future"
description: "Future 与 FutureState：一个不依赖协程的结果承诺。"
---

# Future

在前面的章节中，我们发现协程的行为就像是对结果的一种承诺：
`await` 可以随意调用任意多次，而且总是返回同样的东西。
但协程有一个硬性约束：结果始终由 `spawn` 启动的那个函数产生。
一次调用，一个函数，一个结果。

但如果结果根本不是来自某个函数呢？

我们回到 `ProfileService`。用户修改了自己的送货地址，在保存之前，
需要拿这个地址去核对由 `GeoDirectory` 服务提供的服务区域目录：

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

这份目录很大，加载缓慢，而且对所有人都是一样的。与此同时，
每一个更新资料的请求都需要它，而这些请求是并发处理的。
在每个请求里调用 `spawn(loadRegions(...))` 意味着为了得到相同的答案，
用相同的请求轰炸 `GeoDirectory`。太浪费了。

我们希望的是：第一个请求真正去加载这份目录，而其他所有请求
则等待它的结果。为此我们需要一个地方，让一段代码把结果放进去，
另一段代码把它取出来。

这个地方可以是一个 `Future`。

## FutureState 与 Future

`Future` 既是一个承诺，也是一个存放结果的容器。它不依赖协程，
但它可以和我们已经熟悉的 `await` 一起工作。

`Future` 由两个对象组成：

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — 写入结果。它留在产生结果的一方手中。
- **`Future`** — 读取结果。它交给等待结果的一方。

生产者完成操作，消费者通过我们熟悉的 `await` 等待它：

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

为什么用两个对象而不是一个？拆分能够防止错误。
持有 `Future` 的一方在物理上根本无法完成操作：它上面没有这样的方法。
只有 `FutureState` 的拥有者才被允许写入结果，而且只能写一次：

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

如果操作失败，写入的将是一个异常而不是结果，
`await` 会把它抛给所有正在等待的一方：

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## 解决目录问题

现在我们可以构建一个让并发请求彼此共享的目录加载：

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

第一次调用 `regions` 会启动一个真正执行加载工作的协程。
随后的每一次调用都会拿到同一个 `Future`，并等待这一个共享的结果。
一旦目录加载完成，`await` 就会开始即时返回它，无论被询问多少次：

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

无论有多少请求在并发处理，`GeoDirectory` 都只会被访问恰好一次，
而 `RegionsDirectory` 仍然是一个普通的服务：它可以接入 DI 容器，
在测试中被替换掉，它的所有状态都存在于单个 `$future` 字段中。
注意，`await` 对协程和对 `Future` 的工作方式完全相同，
包括上一章介绍的超时：

```php
$regions = await($directory->regions(), timeout(2000));
```

## 一个你已经拥有的结果

有时结果是预先就知道的。例如，区域目录在服务启动时就被预热，
已经躺在内存里了。为一个已知的值去创建 `FutureState` 和协程
毫无意义，所以有专门的工厂方法来处理这种情况：

```php
// 结果已经在那里了
$future = Future::completed($regionsFromWarmup);

// 错误已经是已知的
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

`regions` 方法可以返回这样一个 `Future`，而消费者不会察觉到任何区别：
它依然调用 `await`，并立即得到结果。

## 一个经典技巧：记忆化

`RegionsDirectory` 其实已经实现了一个叫做记忆化（memoization）的经典技巧：
只计算一次结果，然后把它分发给每一次重复的调用。这个技巧足够通用，
可以包裹在任何带参数的函数外面：

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // 向 GeoDirectory 发起一次请求
$fr = await($regionsOf('FR')); // 向 GeoDirectory 发起一次请求
$de = await($regionsOf('DE')); // 即时返回，来自缓存
```

请注意一个微妙之处：缓存里存的是 `Future` 本身，而不是一个普通的值。
在并发代码中，一个天真的记忆化会遭遇竞态：当第一次调用正在等待
`GeoDirectory` 的答复时，第二次调用检查缓存，发现它是空的，
于是发出了一个重复的请求。这里不存在这样的空隙。`Future` 会立即
落入缓存，甚至早于计算的开始，所以第二次调用会找到它，并单纯地等待。

这个技巧有一个边界：记忆化只对那些在进程生命周期内不会改变的数据有效。
用这种方式缓存一个 token 校验或一个汇率就是个错误：它们依赖于时间，
这样的缓存需要一个有效期，过期之后就要重新获取结果。出于同样的原因，
错误也值得单独考虑：一个失败的 `Future` 同样会永远留在缓存里，
而通常更好的做法是把它移除，好让下一次调用重试。

本章要记住的最重要一点：协程回答的是“我如何得到结果”这个问题，
而 `Future` 只是单纯地承诺一个结果将会存在。它来自哪里，是协程、
缓存，还是另一个线程，都不关消费者的事。生产者和消费者只就一个
结果达成了一致，除此之外对彼此一无所知。

但如果不止一个结果，而是一整个需要在协程之间传递的值的流呢？
为此有一个专门的工具，那就是下一章的主题。
