---
layout: page
lang: zh
path_key: "/rfc.html"
nav_active: rfc
permalink: /zh/rfc.html
page_title: "RFC"
description: "向 PHP 核心添加异步功能的官方提案"
---

## PHP RFC: True Async

TrueAsync 项目在 wiki.php.net 上通过官方 `RFC` 流程推进了大约一年。
已发布两个 `RFC`，描述了基本的并发模型
和结构化并发。

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>作者：Edmond [HT]</span>
<span>版本：1.7</span>
<span>目标版本：PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

定义 PHP 并发模型的主要 `RFC`。
描述了协程、函数 `spawn()` / `await()` / `suspend()`、
`Coroutine` 对象、`Awaitable` 和 `Completable` 接口、
协作取消机制、`Fiber` 集成、
错误处理和优雅关闭。

**关键原则：**

- 以最小的代码更改启用并发
- 协程保持顺序执行的假象
- I/O 操作时自动切换协程
- 协作取消 — "cancellable by design"
- 面向扩展的标准 C API

[在 wiki.php.net 上阅读 RFC &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope 与结构化并发

<div class="rfc-meta">
<span>作者：Edmond [HT]</span>
<span>版本：1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

基础 RFC 的扩展。引入 `Scope` 类，将
协程的生命周期绑定到词法作用域。
描述了 scope 层次结构、错误传播、
"僵尸"协程策略以及通过 `protect()` 实现的临界区。

**解决的问题：**

- 防止协程泄漏到 scope 之外
- scope 退出时自动清理资源
- 层级取消：取消父级 → 取消所有子级
- 保护临界区免受取消
- 死锁和 self-await 检测

[在 wiki.php.net 上阅读 RFC &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## 这些 RFC 的关联

第一个 `RFC` 定义了**底层原语** — 协程、
基础函数和面向扩展的 C API。第二个 RFC 添加了
**结构化并发** — 管理协程组的机制，
使并发代码安全且可预测。

它们共同构成了 PHP 的完整异步编程模型：

|              | RFC #1：True Async                | RFC #2：Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **层级**     | 原语                              | 管理                                    |
| **提供**     | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **类比**     | Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **目标**     | 运行并发代码                      | 安全的生命周期管理                      |

## 当前 RFC 状态

目前 `TrueAsync` 项目在 `RFC` 流程中遇到了不确定性。
在过去几个月里，讨论几乎停滞了，对其未来也没有明确的方向。
很明显，`RFC` 无法通过投票，而且没有办法改变这一点。

出于这些原因，`RFC` 流程目前被视为冻结状态，
项目将在开放社区内继续发展，不再具有"官方"地位。

## 参与讨论

RFC 在 [internals@lists.php.net](mailto:internals@lists.php.net) 邮件列表
和 [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"} 上讨论。

也欢迎加入 [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"} 上的讨论。
