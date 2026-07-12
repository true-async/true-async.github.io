---
layout: tutorial
lang: zh
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /zh/tutors-laravel/05-third-party.html
page_title: "第三方包"
description: "Debugbar、Telescope、Inertia、spatie/permission、Socialite：哪些已经为协程做好了适配，哪些值得禁用。"
---

# 第三方包

我们已经讲完了 Laravel 的核心和你自己的代码。但一个真实项目的依赖列表不止于此：开发环境中的 `Debugbar`、用于日志的 `Telescope`、用于前端的 `Inertia`、用于角色管理的 `spatie/laravel-permission`。它们每一个都是在还没有人设想过单个进程内会有数百个并发请求的年代写成的，每一个都有自己携带状态的单例。好消息是：对于最常见的这些包，这项工作已经完成了。坏消息是：并非全部如此，而分清哪些属于哪一类很重要。

## 已经适配好的

**`spatie/laravel-permission`。** `PermissionRegistrar` 把当前的 `team ID` 和一份通配符权限索引保存在自己的属性上，正是"协程内不能做的事"那一章讲过的那种模式。`AsyncPermissionRegistrar` 把这两者都搬进了 `current_context()`：

```php
class AsyncPermissionRegistrar extends PermissionRegistrar
{
    public function setPermissionsTeamId(int|string|Model|null $id): void
    {
        current_context()->set(self::CTX_TEAM_ID, $id, replace: true);
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return current_context()->find(self::CTX_TEAM_ID);
    }

    // clearPermissionsCollection() 变成了一个空操作：权限列表本身在加载后是只读的，
    // 可以在各个请求之间安全共享。
}
```

你自己的代码不需要做任何改动：`Auth::user()->can(...)`、在中间件中调用 `setPermissionsTeamId()`，一切都和该包文档所描述的完全一样。

**`inertiajs/inertia-laravel`。** `AsyncResponseFactory` 把 `sharedProps`、`rootView`、`version` 和 `encryptHistory` 搬进了上下文，这些原本会在 `ResponseFactory` 单例的属性上累积，并且会从一个请求结束后一直存活到下一个请求中的东西。

**`barryvdh/laravel-debugbar`。** 这里的解决方案要更细致一些。`Debugbar` 会在整个请求过程中收集数据：SQL 查询、消息、耗时，是一个典型的累积型收集器，会在整个处理周期内不断向自身写入数据，包括 `await` 造成的暂停期间。`AsyncDebugbar` 并不会为每个请求解析一个新实例(那样会破坏一次性的事件订阅)，它依然为每个工作进程保留一个 `Debugbar`，但让其中的收集器本身具备上下文感知能力：

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // 这些收集器会在请求中每一次 I/O 暂停时累积数据，
        // 所以存储必须按协程隔离，而不是按实例隔离。
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

这和第一章中 `ScopedServiceProxy` 的区别很关键：在那里，整个服务是按请求重新解析的；而在这里，服务依然是单个实例(重新创建它代价高昂：事件订阅、配置)，只有其中那些具体的累积型收集器变得具备上下文感知能力。诊断结果和"协程内不能做的事"那一章一样("不要写入请求之间共享的状态")，只是针对这个包特有的构造采用了量身定制的疗法。

**`laravel/telescope`。** 类似地：`entriesQueue`、`updatesQueue` 以及 `shouldRecord` 标志位通过一个 `CoroutineSafeRecording` trait 搬进了上下文，是否记录某个请求的决定也是按协程做出的。

**`laravel/socialite`。** 这里更简单：`SocialiteManager` 会把驱动连同最先到达它的那个请求的配置一起缓存下来。修复方法不是写一个适配器，而是使用 `scopedSingleton`，也就是第一章的"方案一"：每个请求都用一个全新的管理器，完全不需要上下文。

## 无需适配即安全

`Cache`、`Queue`、`Mail`、`Log`、`Validation`、`Filesystem`、`HTTP Client`、`Notifications`、`Encryption`、`Hashing`、`Pagination`、`Sanctum`、`Passport`、`Scout`、`Cashier`、`Horizon`，这些也都有单例，但它们持有的是配置和客户端，而不是按请求的数据。`CacheManager` 缓存的是 `Redis` 客户端对象，而不是你放进去的那些值；`MailManager` 缓存的是配置好的 `Mailer`，而不是邮件本身。还是"协程内不能做的事"那一章的同一个问题：这个状态能挺过请求结束并保持正确吗？这里的答案是肯定的，因为这些状态是连接配置，而不是某个用户的数据。

## 不兼容：把它们关掉

**`livewire/livewire`。** 这里值得停下来，不要把之前的乐观情绪一路带下去。`LivewireManager` 在内部深处累积按请求的状态，而 `wire:stream` 建立在关于缓冲式、一次性响应的假设之上，而并发协程模型恰恰打破了这个假设。逐步适配它的尝试没有成功过，无论是对 `laravel-spawn`，还是在它之前对 `Laravel Octane` 都是如此。唯一站得住脚的建议就是在异步模式下完全不启用 `Livewire`。在这套技术栈上做交互式界面，请使用上面已经介绍过的、已经适配好的 `Inertia`。构建在 `Livewire` 之上的 `Filament` 继承了同样的限制。

## 决定你自己用的包

如果你需要的包不在上面任何一个列表里，那么问题和上一章一样，只是这次针对的是别人的代码：这个包的单例是否持有只对某一个请求有效的可变状态？如果是，有三条路可走，而且它们并不等价。

最快的一条是在配置中使用 `scoped_services`，也就是"方案一"：该包会在每个请求中被重新解析，它自己的代码保持不变。

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

如果重新创建它的代价很高(该包初始化成本高，或者自己在请求之间缓存了一些有用的东西)，那就参照本章 `AsyncPermissionRegistrar` 或 `AsyncDebugbar` 的模式写一个针对性的适配器：继承它，添加一个 `bootCompleted()`，只把那些确实会在请求之间变化的东西搬进 `current_context()`，其余部分保持原样。

而如果它不是一个独立的服务，而是像 `Livewire` 那样根深蒂固的模式，就不要花上一周去适配它，结果一周后才发现 `wire:stream` 出于架构原因根本无法工作。把上一章的 `MutableStaticPropertyRule` 跑在该包的源码上：如果结果多达几十条，并且命中的是包的核心而不是安全的启动期缓存，那就是一个信号，说明应该把它排除在异步模式之外，而不是去修复它。

我们已经讲完了你自己的代码、Laravel 的核心，以及它周围的生态系统。剩下的就是看数字了：当所有这一切都到位之后，一个应用到底能快多少。
