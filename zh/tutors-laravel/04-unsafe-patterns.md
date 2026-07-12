---
layout: tutorial
lang: zh
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /zh/tutors-laravel/04-unsafe-patterns.html
page_title: "协程内不能做的事"
description: "可变的静态属性、单例上的 once()，以及 Number::useLocale()：状态在请求之间泄漏的常见方式，以及如何用静态分析捕获它们。"
---

# 协程内不能做的事

前面几章修复了具体的状态泄漏：`auth`/`session` 通过上下文解决，事务计数器通过 trait 解决。`laravel-spawn` 已经替你堵上了这些漏洞。但框架很庞大，第三方包更是数不胜数，明天你团队中的某个人还会写出自己的服务。你需要的是一条一眼就能套用的规则，用来区分哪些代码对并发协程是安全的，哪些代码终有一天会把别人的数据泄漏给某个用户。

## 一条规则：启动之后不要写入 static

下面每个例子都是同一个错误的特例：某段代码把一个值写入了进程内每个协程共享的内存，而这个值本应属于某一个具体的请求。

**服务上一个可变的静态属性。**

```php
// 危险
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

它看起来像是一个无害的记忆化(memoization)。实际上它是一个被所有协程共享的数组。如果 `computeExpensive()` 依赖任何在请求之间会变化的东西，比如用户的货币、地区加价，那么第一个请求就会替所有后续请求决定缓存的命运。修复方法很简单：用实例属性代替 `static`，并让服务按请求解析(即第一章中的"方案一")。

**如果这个服务是你自己的，并且你确实需要按请求维护状态呢？** 你不需要等 `laravel-spawn` 提供一个 `ScopedService` 及其代理，用的是同一个手法，也就是在第二章中解决事务计数器问题的那个技巧，只是提升了一个层级：不用只属于单个协程的 `coroutine_context()`，而用在整个请求的协程树中共享的 `request_context()`。

```php
class PriceCalculator  // 仍然是单例
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

和上一个例子的区别看起来很小，实际上是根本性的：这个数组不再存放于整个进程共享的类级 `static` 属性上，而是存放于某一个具体请求的作用域上下文中。两个并发的请求调用的是同一个 `PriceCalculator` 实例，但各自都得到了自己的 `$cache`，因为 `request_context()` 对它们各自解析出的是不同的作用域。关于 `coroutine_context()` 和 `request_context()` 的详细介绍见[第二章](/zh/tutors-laravel/02-pool-transactions.html)。

**单例上的 `once()`。**

```php
// 危险
class CurrentUserService  // 注册为单例
{
    public function get()
    {
        return once(fn() => Auth::user());  // 永久缓存第一个用户
    }
}
```

`once()` 会把闭包的结果缓存在一个以调用所属对象为键的 `WeakMap` 中。对于单例来说，那个对象在整个进程中只有一份，所以缓存也只有一份。第一个请求计算出用户，后续每个请求都拿到同一个用户。而在按请求创建的对象(控制器、`Eloquent` 模型)上，`once()` 是完全安全的，因为在那里对象本身每个请求都是全新的。

**像 `Number::useLocale()` 这样的全局变更。**

```php
// 危险
Number::useLocale('de');
$price = Number::format(1234.5);       // 如果协程在这行代码之前进入休眠会怎样？

// 安全
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` 会更改 `Number` 类上的一个静态变量。在调用 `useLocale()` 和 `format()` 之间，可能会发生一次 `await`、一次 `delay()`，或者任何一次数据库访问，换句话说，一个调度器把控制权交给另一个协程的时间点。如果那个协程也在没有显式指定区域设置的情况下调用了 `Number::format()`，它拿到的就是别人刚刚设置的那个区域设置。显式的 `locale:` 参数则完全消除了竞态的可能性：因为没有什么需要共享，也就没有什么需要保护。

**超全局变量。** `$_GET`、`$_POST`、`$_SERVER`、`$_SESSION` 在 PHP-FPM 下之所以安全，仅仅是因为它们的生命周期只有一个请求那么长。在协程工作进程中，它们是整个进程共享的变量，是由服务器更新的，而不是像你习惯的那样由 PHP 在每个新连接上更新。使用 `Request` 对象，`laravel-spawn` 已经通过 `current_context()` 将其隔离好了，不要碰超全局变量。

## static 什么时候确实是安全的

同样重要的是，不要走向另一个极端，把每一个 `static` 都判定为罪魁祸首。以下这些是安全的：

- **`readonly static`**，如果一个值在初始化之后永不改变，在协程之间共享它并不比共享一个常量更危险。
- **启动期配置**，一个在工作进程启动时设置一次、此后只读取的 `static`(路由、编译好的模板、注册的宏)。
- **确定性缓存**，如果结果只依赖于输入参数，而不依赖于"当前"请求(比如给定字符串的 `Str::camel()` 缓存永远是同一个字符串)，那么填充它时的竞态并不会破坏数据，最坏的情况只是重复计算了一次。
- **没有语义的单调计数器**，比如给 SQL 别名生成唯一值的内部自增计数器：即便两个请求拿到了同一个数字，这种碰撞也不会产生错误的数据，最多是别名不那么好看而已。

区别始终是同一个问题：被共享的是*一个不依赖请求的计算结果*，还是*属于某一个具体请求的状态*？前者是优化，后者是泄漏。

## 用静态分析代替仔细阅读

手动翻遍每一个第三方包，去寻找没有 `readonly` 的 `private static`，正是那种你乐于交给 linter 去做的工作。这个包为此内置了一条 `PHPStan` 规则：

```php
final class MutableStaticPropertyRule implements Rule
{
    public function getNodeType(): string
    {
        return Property::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (! $node->isStatic() || $node->isReadonly()) {
            return [];
        }

        // ... 提示信息"协程之间可能存在状态泄漏"
    }
}
```

这条规则再简单不过了：找到每一个没有 `readonly` 修饰符的 `static` 属性并标记出来。会有不少误报，正是上一节列出的那些"安全"情形，但这是一个刻意的权衡：漏掉一个真实的泄漏，比手动排查一遍候选列表要昂贵得多。

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

把这条规则跑在 Laravel 框架自身上，会得到三百多条结果。绝大多数正是上一节所说的那种安全的 `static`：编译好的 `BladeCompiler` 缓存、在 `boot()` 中设置一次的配置标志位、内部访问已经隔离好的 `$app['request']` 的解析器。花一刻钟排查一遍三百行代码是件小事。而哪怕漏掉一个，在生产环境中撞上泄漏，去调试别人一条"我看到了另一个用户的资料"的错误报告，则要花上好几个小时。

## 总结

在一段运行于请求处理器内部的代码中留下一个 `static`(或者一个带可变属性的单例)之前，先问自己一个问题：这个值能挺过当前请求的结束，并且对下一个请求依然是正确的吗？如果能，那它就是安全的。如果它本应随请求一起过期，却物理上一直存活在共享的进程内存中，那它就是 `ScopedService`、`request_context()`/`coroutine_context()`(见[第二章](/zh/tutors-laravel/02-pool-transactions.html))，或者一个按请求重新创建的普通实例属性的候选对象。

我们已经讲完了你自己的代码和 Laravel 自带的部分。但一个真实的项目里通常还紧挨着 `spatie/laravel-permission`、`Telescope`、`Inertia` 和 `Debugbar`，它们各自都有自己的可变状态历史。哪些已经被适配好了，哪些又值得在异步模式下禁用，是下一章的主题。
