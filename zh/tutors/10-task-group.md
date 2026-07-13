---
layout: tutorial
lang: zh
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /zh/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup：一组带结果的任务，以及 all、race、any 等待策略。"
---

# TaskGroup

假设一个用户资料页由三个来源组装而成：来自数据库的用户数据、
来自数据库的订单，以及来自外部 API 的评价。这些来源彼此不依赖，
所以它们应该被并发地请求。我们已经知道怎么做这件事：

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

对三个任务来说还能忍受。但仔细看：这又是讲 `Scope` 那一章里的
手动记账，只不过现在我们还需要结果。每个协程都得被记住并被等待，
而且如果 `fetchUser` 抛出一个异常，`fetchOrders` 和 `fetchReviews`
就会白白地继续运行：它们得在一个 `catch` 里被“手动”取消。

而且有些任务，手动的做法会变得真正令人痛苦。例如，取用最先完成的
那个协程的结果，并取消其余的。试着用循环里的 `await` 去写它，
你最终会陷入一团检查和取消的乱麻里。

`Scope` 在这里也帮不上多大忙：它管理协程的生命周期，但对它们的
结果一无所知。我们需要一个更高层的原语。

## 一组任务

`TaskGroup` 把任务捆绑成一个整体：它在自己的 `Scope` 里运行它们，
存储它们的结果，并让你把整个组作为一个单元来等待：

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

`all()` 方法返回一个我们熟悉的 `Future`，一旦每个任务都完成，
它就会解析为一个结果数组。我们通过 `spawnWithKey` 自己指派了键，
所以数组里存的是有名字的条目，而不是普通的索引。

而且既然它是一个 `Future`，超时就是免费附送的，通过一如既往的
同一个令牌：

```php
$data = $group->all()->await(timeout(5000));
```

如果哪怕只有一个任务抛出异常，这个组的行为就和第八章里的 Scope
一样：其余的任务会被取消，而 `await` 会抛出一个持有所有错误的
`CompositeException`。这个组要么收集到一切，要么什么都收集不到：
不存在中间状态。

## 最先完成的：race

`all()` 只是等待策略之一。回想一下 `GeoDirectory`：它有三个副本，
其中一个有时会很慢。经典的招数：把请求发给所有副本，取用第一个答复：

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` 会以最先完成的那个任务的结果来解析，无论那是成功还是失败。
正是那个“取用第一个，别等其余”的场景，也就是那么难以手写的场景。

## 最先成功的：any

`race()` 有一个尖锐的边角：如果最先完成的那个任务恰好是失败的，
你拿到的就是它的异常。有时你需要更温和一点的东西：尝试几个提供方，
取用第一个成功的答复，对失败视而不见：

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` 会忽略失败，并返回第一个胜出者。只有当每个任务都失败时，
你才会拿到一个异常，而且它将是一个带有完整原因列表的
`CompositeException`。注意那个 `suppressErrors()` 调用：没有人
处理那些落败提供方的错误，而这个组想要一个明确的确认，表明这是
有意为之的。这是讲异常那一章里的一个熟悉原则：一个错误不能就那么
悄无声息地消失。

## 并发上限

现在来点意想不到的。还记得讲通道那一章里的工作池吗：一个通道、
十个协程、一个 `recv` 循环？`TaskGroup` 用几行就能做到同样的事：

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // 结果在就绪时陆续到达
}
```

`concurrency: 10` 这个参数限制了同一时刻运行多少个任务：其余的
排队等候，在有空位腾出来之前甚至都不会启动一个协程。`close()`
扮演的角色和它对通道所扮演的一样：它宣告没有新任务会到来了。
而 `foreach` 会在结果就绪时把它们分发出去，无需等待整个组完成。

这是否意味着通道到头来根本没必要？不。通道是一个同步原语，
你能用它构建出任何东西。`TaskGroup` 是针对最常见的情况的一套
现成组装件：“运行一组任务并取得结果”。当一个任务符合这个模式时，
就伸手去拿 `TaskGroup`；当你需要一个非标准的拓扑时，通道和 Scope
依然握在你手里。

归根结底：`TaskGroup` 就是 Scope 加上结果。一组任务变成了一个
单一的值，你可以向它一次性索取全部、最先完成的那个，
或者最先成功的那个。

最后一个细节：`TaskGroup` 会小心翼翼地把所有结果都保留在身边。
调用 `race()` 两次，你两次都会拿到同样的答案。用 `foreach` 再遍历
一次这个组，它会从头把一切再分发一遍。对于一个资料页来说，
这很方便。现在设想一个流水线，让十万个任务经过一个组。这个组
记住的一切都活在内存里。看出问题所在了吗？这就是我们将在下一章里
要谈的事情。
