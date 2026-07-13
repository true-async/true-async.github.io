---
layout: tutorial
lang: zh
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /zh/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet：一个自清理的任务流，joinNext/joinAny/joinAll，以及一个监督者循环。"
---

# TaskSet

上一章揭示了 `TaskGroup` 会记住一切。这并非偶然，而是一个你可以依赖的特性：无论你向组请求多少次结果，
得到的都是同一个答案。这种行为叫做幂等性，我们之前也遇到过它：对一个协程重复调用 `await`，每次都会返回
同样的结果。

但记忆是有代价的。让十万个任务流经一个组，那么这十万个结果就会全部留在它里面，哪怕每个结果实际上只在它变为
就绪的那一刻被用过一次。对于一个运行数小时的流水线来说，这不是存储，而是泄漏。

我们需要的是一个与 `TaskGroup` 秉性相反的孪生兄弟：交出结果后就忘掉它。它叫做 `TaskSet`。

## 消费而非存储

表面上看一切都一样：`spawn`、`close`、一个并发上限。区别在于结果被交付之后会发生什么：

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta，已经是另一个了！
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0，集合为空
```

每次调用 `joinNext()` 都会返回下一个就绪的结果，并从集合中移除它的条目。将它和 `TaskGroup` 的 `race()`
比较一下，后者无论你调用多少次都会返回同一个最先胜出者。`TaskSet` 的行为不像存储，而更像一个队列：读取它，
它就消失了。是的，这和通道那一章里的 `recv` 是同样的语义，只不过现在队列里存放的不是值，而是正在完成的任务。

这对孪生兄弟的等待方法彼此呼应：

- **`joinNext()`** — 类似 `race()`：第一个完成的任务，其条目被移除。
- **`joinAny()`** — 类似 `any()`：第一个成功的任务，其条目被移除。
- **`joinAll()`** — 类似 `all()`：一次性拿到所有结果，集合被清空。

`join` 前缀本身就暗示了区别：结果不只是被读取，而是被取走了。

## 没有泄漏的流水线

让我们用现在所学的知识重写那个十万行的导入任务：

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Address not verified: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

一个协程读取文件并不断向它投喂任务，而主流程则在结果就绪时逐个处理它们。每个被处理过的条目会立即从集合中移除，
因此内存只保留正在进行中的任务：十个正在运行的，加上队列里的。文件可以是任意大小；内存占用并不取决于它。

请注意那些熟悉的细节是如何汇聚成一幅新图景的：一个并发上限取代了手工搭建的工作者池，`close()` 作为“不再有任务
到来”的信号，`[$result, $error]` 配对取代了被默默吞掉的异常，以及第九章里的 `PDO`，它对并发调用 `saveAddress`
毫不在意。

## 监督者

还有第二种场景，这种消费语义在其中不可或缺：那种监视长生命周期任务、并在它们结束时做出反应的代码。

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Service $key stopped" . ($error ? ": {$error->getMessage()}" : ''));

    // 重启宕掉的服务
    $set->spawnWithKey($key, restartService($key));
}
```

这个集合从不关闭，所以 `foreach` 永远不会结束，它只是一直等待下一个事件。每个被处理过的条目都会被移除，
重启后的服务被重新加入到它的位置，循环便永远存活下去。监督者并不需要一份从洪荒之初以来每一次完成的历史；
它需要的恰恰是这个：它照看的某一个停下来了，去弄清原因并重启它。你无法用 `TaskGroup` 写出这个循环：它的
`foreach` 每一次都会从第一个停下的服务重新开始。

所以，这本质上就是这对孪生兄弟之间的全部区别：记忆。组存储结果，并能反复回答关于它们的任何问题，这使它适用于
任务集合固定、且结果作为一个整体才有意义的场景。集合把每个结果交出去一次，随即释放内存，这就是它能处理无尽任务
流的原因。有一条简单的选择规则：如果你向任务提出的问题是“你们得出了什么？”，就选 `TaskGroup`；如果是“下一个
是什么？”，就选 `TaskSet`。

在过去四章里我们把同一件事做了三遍：遍历一个集合，在上限之内对每个元素做并发工作。一次用通道加工作者，一次用
`TaskGroup`，一次用 `TaskSet`。这个模式难道不该拥有一个属于自己的名字，并缩减成短短一行吗？
