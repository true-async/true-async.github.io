---
layout: tutorial
lang: ko
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /ko/tutors-laravel/01-start.html
page_title: "코루틴 서버 안에서 Laravel 실행하기"
description: "단계별로 보는 TrueAsync Server 위의 Laravel 실행과 첫 API: 라우트에서 데이터베이스까지."
---

# 코루틴 서버 안에서 Laravel 실행하기

`Laravel` 프레임워크는 원래 코루틴 서버를 위해 만들어지지 않았기 때문에,
그대로 가져와서 `TrueAsync` 위에서 실행할 수는 없습니다.

하지만 [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
프로젝트가 전용 어댑터 세트로 이 문제를 해결했습니다.

## 1단계. 패키지 설치

```bash
composer require yangusik/laravel-spawn
```

서비스 프로바이더는 자동으로 등록됩니다. 서버 설정을 퍼블리시합니다.

```bash
php artisan vendor:publish --tag=async-config
```

이 명령은 `config/async.php`를 생성하며, 여기에는 리스너, 워커 수,
데이터베이스 커넥션 풀, 그리고 매 요청마다 다시 리졸브해야 하는
서비스 목록이 담깁니다.

## 2단계. 서버 시작

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

이 명령은 `TrueAsync Server`를 시작하고 Laravel의 라우터를 연결합니다.

```bash
$ curl http://localhost:8080/
```

Laravel의 기본 웰컴 페이지가 보인다면 정상적으로 동작하는 것입니다.
여기서부터 그 위에 실제 `API`를 구축합니다.

## 3단계. 라우트

특별할 것 없는 평범한 `routes/api.php`입니다.

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` 모두 평소처럼 동작합니다.
라우터는 워커가 시작될 때 한 번 빌드되어 이후의 모든 요청 동안 유지됩니다.

## 4단계. 컨트롤러

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

검증, `Eloquent`, `findOrFail`, 예외로 던져지는 자동 `404`, 모두 동기 `Laravel`과
완전히 동일합니다. 차이는 더 깊은 곳에 숨어 있습니다. 이 핸들러가 데이터베이스의
응답을 기다리는 동안, 워커는 이미 이웃 코루틴에서 다음 요청을 처리하고 있습니다.

## 5단계. 인증과 세션

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` 모두 변경 없이
동작합니다. 이 패키지는 이미 수백 개의 다른 요청이 바로 옆에서 병행으로
처리되는 중에도 각 요청이 자신만의 사용자와 세션을 보는 것을 보장합니다.
이 동작이 내부적으로 정확히 어떻게 이루어지는지는 다음 장의 주제이지만,
컨트롤러의 관점에서는 그냥 잘 동작할 뿐입니다.

## 6단계. 데이터베이스

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

`Eloquent` 쿼리, 트랜잭션, `DB::transaction(...)` 모두 평소와 완전히 동일하게
작성합니다. 내부적으로는 각 요청이 모두가 하나를 공유하는 대신 내장된
`PDO Pool`에서 자신만의 물리적 커넥션을 받습니다. 이 풀의 동작 원리는
코어 시리즈에서 이미 살펴본 바 있습니다.

## 다음 단계

이 여섯 단계에 걸쳐 만든 `API`는 이미 `TrueAsync Server` 위에서 실행되는
실제 Laravel 애플리케이션입니다: 라우트, 컨트롤러, 인증, 데이터베이스까지.
다음 장들에서는 이런 요청 수백 개가 하나의 프로세스에서 병행으로 실행될 때
내부에서 정확히 무슨 일이 일어나는지 설명합니다: 커넥션 풀과 트랜잭션이
어떻게 동작하는지, 어떤 코드 패턴이 코루틴 안에서 위험한지, 그리고
`Telescope`나 `spatie/laravel-permission` 같은 인기 패키지들이 어떻게
동작하는지 다룹니다.
