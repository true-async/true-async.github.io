---
layout: tutorial
lang: zh
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /zh/tutors-laravel/02-pool-transactions.html
page_title: "连接池与事务"
description: "Eloquent 之下的 PDO Pool 与 CoroutineTransactions：为什么嵌套事务计数器不能留在 Connection 的属性上。"
---

# 连接池与事务

`Auth`、`session`、`request`：我们在上一章已经解决了这些问题，用上下文加代理，框架不再混淆请求。数据库看起来应该更简单：核心系列的第九章早已解决过它，`PDO Pool` 为每个协程分配自己的连接，并自行收回。对 `Eloquent` 而言，这里还能出什么问题呢？

确实会出问题。连接池会透明地管理连接，但它对 `Laravel` 保存在该连接旁边的另一份状态一无所知：事务嵌套计数器。

## `transactionLevel()` 存在于哪里

在 `Illuminate\Database\Connection` 内部有一个普通的实例属性：

```php
protected $transactions = 0;
```

`beginTransaction()` 会递增它，`commit()` 和 `rollBack()` 会递减它。只要一个 `Connection` 服务于一个进程，这就完全说得通：一个属性对应一个事务。但 `PDO Pool` 运作在 `Connection` 之下的一层。它在对象底层替换物理连接，而 `Connection` 对象本身，也就是 `$this->transactions` 所依附的那个对象，仍然是整个 `DatabaseManager` 共享的同一个实例。

让我们用数据库重现上一章的场景：

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // 协程恰好在事务内部进入休眠
    });

    $response->json(['ok' => true]);
});
```

两个请求并发进入 `DB::transaction()`。连接池确实老老实实地为它们各自分配了独立的物理连接。但对两者来说，`$this->transactions` 都是同一个 `Connection` 对象上的同一个数字。第一个协程把计数器推到 `1`，然后进入休眠。第二个协程也把它递增，但这次变成了 `2`，尽管对它来说这本应是级别为 `1` 的外层事务。第一个协程中的 `commit()` 会针对错误的嵌套级别操作，导致 Laravel 悄悄在不该发出 `SAVEPOINT` 的地方发出了它，或者提前提交了一个仍被相邻协程持有的事务。

## 同样的方案，不同的作用域：协程，而非请求树

在上一章中，`auth` 状态存放在作用域上下文中，因为它在同一请求的每个协程之间是共享的。事务计数器的构造不同：`PDO Pool` 是按*协程*而非整个请求分发物理连接的（处理器内部并行的 `TaskGroup` 会从连接池获得两个独立的连接）。因此计数器必须存放在协程上下文中，而不是作用域上下文中：

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction()、commit()、rollBack() 以及错误处理方法都以同样的方式被重写：
    // 它们不再读写 $this->transactions，而是改为通过
    // setTransactionLevel()/transactionLevel() 来操作。
}
```

`coroutine_context()` 与 `current_context()` 之间的区别，正是核心系列 `Context` 一章讨论过的那条边界：前者只属于单个协程私有，后者在一个请求的整棵协程树中共享。这里的选择不是风格问题，而是强制性的：一旦用混了，一个请求内两次并发的数据库访问就会再次开始共享别人的事务计数器，坑只是换了个楼层。

这个 trait 并不会整体重写 `Connection`，它精准地拦截了那些触碰 `$this->transactions` 的方法，并被挂载到一个特定的连接类上：

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

每种 `DBMS` 都有单独的类，`AsyncPgsqlConnection`、`AsyncMySqlConnection`、`AsyncMariaDbConnection`、`AsyncSqliteConnection`、`AsyncSqlServerConnection`，因为 Laravel 的父类本身就各不相同，而计数器隔离这个 trait 对它们所有类来说都是同一个。

## 为什么不能干脆把整个 `DatabaseManager` 放进作用域

这个诱惑是存在的：既然我们已经知道如何用上下文隐藏一个服务(上一章的 `ScopedServiceProxy`)，为什么不对 `db` 也这么做呢？没有这么做的原因相当棘手。`DatabaseServiceProvider::boot()` 在启动时会写下这一行：

```php
Model::setConnectionResolver($app['db']);
```

那是 `Model` 类本身的静态属性，被每个模型和每个请求共享。如果 `db` 在每个作用域中被解析出不同的实例，这个静态引用就会一直指向最先创建它的那个请求所对应的 `DatabaseManager`。一旦那个请求的作用域结束并被清理，`Model::$resolver` 指向的对象就会被垃圾回收，而这个静态属性会留下来指向已失效的内存。其结果不是"数据错误"，而是整个进程崩溃。

所以 `db` 一如既往地保持为单例。物理连接的隔离是 `PDO Pool` 在 `C` 层的职责，而不是依赖容器的职责。事务计数器的隔离是这个 trait 在单个协程层面的职责。两个精确而狭窄的工具，胜过一次会顺带把服务器搞垮的大规模重构。

我们已经处理完请求状态和事务状态。Laravel 会自行处理普通的 HTTP 响应，把它们整体缓冲起来。但如果响应不是一次性的，而是一个流呢：给浏览器的进度条，或者相邻服务通过 gRPC 发起的调用？这正是下一章要讲的内容。
