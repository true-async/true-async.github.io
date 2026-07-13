---
layout: tutorial
lang: zh
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /zh/tutors-laravel/01-start.html
page_title: "在协程服务器中运行 Laravel"
description: "循序渐进：在 TrueAsync Server 下运行 Laravel，并从路由到数据库构建你的第一个 API。"
---

# 在协程服务器中运行 Laravel

`Laravel` 框架最初并不是为协程服务器设计的，所以你不能拿起它直接在 `TrueAsync` 上运行。

不过，[`laravel-spawn`](https://github.com/YanGusik/laravel-spawn) 项目通过一组专门的适配器解决了这个问题。

## 第一步：安装包

```bash
composer require yangusik/laravel-spawn
```

服务提供者会自动注册。发布服务器配置：

```bash
php artisan vendor:publish --tag=async-config
```

这会生成 `config/async.php`，其中保存了监听器、工作进程数量、数据库连接池，以及一份需要在每个请求中重新解析的服务列表。

## 第二步：启动服务器

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

该命令会启动 `TrueAsync Server` 并接入 Laravel 的路由器。

```bash
$ curl http://localhost:8080/
```

如果你看到 Laravel 默认的欢迎页面，说明一切正常。接下来我们在此基础上构建一个真正的 `API`。

## 第三步：路由

没有什么特别的，一个普通的 `routes/api.php`：

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`、`Route::post`、`Route::apiResource` 都像往常一样工作。路由器在工作进程启动时构建一次，并在此后处理的每个请求中始终有效。

## 第四步：控制器

```php
class ProfileController extends Controller
{
    public function show(int $id)
    {
        $user = User::with(['orders', 'reviews'])->findOrFail($id);

        return response()->json($user);
    }

    public function updateAddress(int $id, Request $request)
    {
        $request->validate(['address' => 'required|array']);

        $user = User::findOrFail($id);
        $user->update(['address' => $request->input('address')]);

        return response()->json(['ok' => true]);
    }
}
```

验证、`Eloquent`、`findOrFail`、自动抛出的 `404` 异常，一切都和同步的 `Laravel` 完全一样。区别隐藏在更深处：当这个处理器等待数据库响应时，工作进程已经在相邻的协程里处理下一个请求了。

## 第五步：认证与会话

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`、`$request->user()`、`session()->get(...)` 都无需改动即可正常工作。该包已经确保每个请求都能看到属于自己的用户和会话，即便旁边同时有数百个其他请求正在被并发处理。这背后的具体原理是下一章的主题，但从控制器的角度看，它就是直接能用。

## 第六步：数据库

```env
DB_CONNECTION=pgsql
```

```php
// config/async.php
'db_pool' => [
    'enabled' => true,
    'min'     => 2,
    'max'     => 10,
],
```

`Eloquent` 查询、事务、`DB::transaction(...)`，都和往常一样编写。在底层，每个请求都会从内置的 `PDO Pool` 获得自己独立的物理连接，而不是与所有人共用一个。你在核心系列中已经见过这个连接池的运作机制。

## 接下来

在这六个步骤中构建的这个 `API`，已经是一个运行在 `TrueAsync Server` 之下的真正 Laravel 应用：路由、控制器、认证、数据库一应俱全。接下来的几章会详细说明：当数百个这样的请求在同一进程中并发运行时，底层到底发生了什么；连接池和事务是如何工作的；哪些代码模式在协程中是危险的；以及像 `Telescope` 和 `spatie/laravel-permission` 这样的流行包的表现如何。
