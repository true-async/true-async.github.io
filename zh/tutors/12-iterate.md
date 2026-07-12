---
layout: tutorial
lang: zh
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /zh/tutors/12-iterate.html
page_title: "并发迭代器"
description: "iterate()：一行代码实现集合的并发遍历、生成器与提前退出。"
---

# 并发迭代器

让我们数一数，同一个模式我们已经搭建了多少次。在通道那一章：一个通道、十个工作者、一个 `recv` 循环。在
TaskGroup 那一章：`concurrency: 10`、一个 `spawn` 循环、`close()`。在 TaskSet 那一章：同样的东西，只是消费
结果。每一次，任务听起来都一样：遍历一个集合，对每个元素做并发工作，且绝不超过上限。

一个如此常见的模式理应拥有一个属于自己的函数：

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

这就是整个工作者池。`iterate` 为集合的每个元素在各自的协程里调用该函数，确保同时运行的不超过十个，并在
一切处理完毕后交还控制权。

## 用生成器取代数组

等等，那读取文件怎么办？为了调用 `iterate` 而把十万个地址收集进一个数组，这会是一种倒退：通道那一章里的
背压正是替我们省下内存的东西。没问题：`iterate` 接受的不只是数组，而是任何 `Traversable`，包括生成器：

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

生成器惰性地读取文件，一次一行。`iterate` 只在某个槽位空出来后才拉取下一个地址，所以文件永远不会被整个
一次性地保存在内存里。这和带缓冲的通道给你的背压是一样的，只不过现在它是隐形的：剩下的只是表达意图的短短一行。

## 提前退出

处理函数可以通过返回 `false` 来停止整个遍历：

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // 文件已损坏，没必要继续
    }
}, concurrency: 10);
```

连续一百个无效地址是一个可靠的信号，说明我们拿到了错误的文件。在 `false` 之后不会再有新元素启动，已经在运行
的协程会做完手头的事，然后 `iterate` 返回。

异常则更为严格，你从 Scope 那里已经知道了规则：任何处理器中的错误都会停止遍历、取消剩余的协程，并向外传播。
默认就是“同生共死”：

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

这背后没有魔法：`iterate` 内部住着一个第八章里那种普通的子作用域，正是它在保持一切井然有序。

## 一架抽象的阶梯

在六章的篇幅里，一整架阶梯已经成形，值得再从下往上回顾一次：

- **通道 + Scope** — 原语。任何拓扑：池、流水线、会合点、监督者。最大的控制力，最多的代码。
- **`TaskGroup` / `TaskSet`** — 面向一组任务的现成组件，当你需要结果时：全部结果、第一个、第一个成功的，
  或者在它们就绪时逐个取得。
- **`iterate()`** — 短短一行，当你不需要结果、只需要并发地遍历一个集合时。

在阶梯上越往上，代码越少，适用的场景也越窄。从顶端开始：如果 `iterate` 就够了，就没有理由去搭建一个组；
如果一个组还不够，就下降到通道。在底部你可以组装出任何你喜欢的构造；在顶部，一切都已经替你组装好了。

请注意我们的导入任务发生了什么：一章又一章，它不断缩小，直到最终容纳在短短一行里。这正是它应有的样子。并发不再
是一件大事，而成了一个像 `foreach` 一样普通的工具。

但第九章的一个问题仍然悬而未决。对于 PDO，连接池内建在核心之中，而 `checkAddress` 通过 HTTP 与
`GeoDirectory` 通信。它的连接同样值得复用，不仅是它的：套接字、客户端，以及广义上的重型对象。难道我们每一次
都真的得用一个通道手工搭建一个池吗？幸运的是，不必，下一章将向你说明原因。
