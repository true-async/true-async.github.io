---
layout: tutorial
lang: ko
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /ko/tutors-laravel/03-sse-grpc.html
page_title: "Laravel과 함께 사용하는 SSE와 gRPC"
description: "trueasync_response(), Sse, grpc_handlers: 컨트롤러에서 곧바로 버퍼링된 Illuminate Response 너머에 접근하기."
---

# Laravel과 함께 사용하는 SSE와 gRPC

`laravel-spawn` 내부의 `TrueAsyncServer`는 단순하게 구축되어 있습니다.
`HttpRequest`를 받아 그것으로 `Illuminate\Http\Request`를 조립하고,
`Kernel::handle()`을 거쳐 `Illuminate\Http\Response`를 얻은 뒤, 그
전체를 `HttpResponse`로 버퍼링해서 전송합니다. 요청 하나에 응답 하나,
모든 콘텐츠를 한 번에. Laravel이 역사 내내 익숙해져 온 바로 그 방식입니다.

하지만 이 사이트의 두 번째 시리즈에서는 `SSE`와 `gRPC`가 같은 포트 위에서
진행률 표시줄을 보여주었고, 둘 다 "응답 하나" 공식이 아니라 "메시지의
스트림" 공식으로 살아갑니다. 버퍼링된 `Illuminate\Response`는 이를 위해
만들어지지 않았습니다. `sseEvent()`도 `writeMessage()`도 없습니다.
그래서 컨트롤러에는 버퍼를 건너뛰고 실제 원시 `HttpResponse`에 도달할
방법이 필요합니다.

## 언제든 꺼내 쓸 수 있는 원시 응답

`laravel-spawn`은 Laravel의 라우터에 제어를 넘기기 전에 현재 요청의
`HttpRequest`와 `HttpResponse`를 `request_context()`에 넣어 둡니다.
1장에서 Laravel 자신이 `auth`와 `session`을 그곳에 넣을 때 쓴 것과 같은
방법입니다. 다음 두 함수로 이들을 가져올 수 있습니다.

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

컨트롤러가 원시 응답에 직접 쓰고 스스로 닫으면(`$res->end()`), 이제는
평소의 `Illuminate\Response` 경로가 더 이상 필요 없습니다. `TrueAsyncServer`는
버퍼링 전에 `isClosed()`를 확인하며, 응답이 이미 수동으로 전송되었다면
그 위에 아무것도 덧붙이지 않습니다. 컨트롤러는 여전히 무언가를 반환해야
합니다. Laravel이 그것을 요구하기 때문입니다. 하지만 그 반환값의 내용은
더 이상 아무도 신경 쓰지 않습니다.

## SSE: Laravel 라우트 안의 진행률 표시줄

`trueasync_response()`를 통해 매번 `sseStart()`/`sseEvent()`/`sseComment()`에
접근하는 것은 불편하므로, 패키지는 얇은 래퍼를 제공합니다.

```php
use Spawn\Laravel\Sse\Sse;
use function Async\delay;

Route::get('/import/progress', function () {
    Sse::start(retryMs: 3000);

    $import = currentImport();

    while (!$import->isFinished()) {
        Sse::event(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!Sse::connected()) {
            break; // 탭이 닫혔습니다
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

이 코드가 눈에 익나요? 서버 시리즈 6장의 진행률 표시줄과 한 글자도
다르지 않습니다. `$res->sseEvent()`가 `Sse::event()`로 바뀌었을 뿐입니다.
이 라우트 안에서도 `Auth::user()`, `session()`, `Eloquent`가 모두
그대로 사용 가능합니다. 평범한 Laravel 핸들러일 뿐이며, 단지 응답을
한 번이 아니라 스트림으로 할 뿐입니다. 미들웨어, `Route::middleware('auth:sanctum')`를
통한 인가, 1장에서 다룬 요청별 상태를 위한 `current_context()`, 이 모든
것이 평소처럼 동작합니다. 이 코드를 둘러싼 `Kernel::handle()`은 단 한 줄도
바뀌지 않았기 때문입니다.

Laravel과는 전혀 무관한 설정 하나는 서버 자체에 관한 것입니다. 장수명
스트림은 평범한 응답들이 실제로 필요로 하는 쓰기 타임아웃에 의해 끊어져서는
안 되므로, 스트림을 사용하는 서비스는 `.env`에서 `ASYNC_WRITE_TIMEOUT=0`으로
이를 전역적으로 끕니다. 서버 시리즈의 프로덕션 장에서 쓴 것과 같은 방법입니다.

## gRPC: 라우트 대신 계약

`gRPC`에서는 타협이 더 거칠어집니다. 이 프로토콜은 protobuf로 인코딩된
메시지로 대화하는데, 이는 `Illuminate\Http\Request`는 물론이고 `Response`에는
더더욱 의미 있게 매핑되지 않습니다. Laravel의 라우팅과 미들웨어를 통과시키기
위해 가짜 HTTP 요청을 조작하는 것은 무의미합니다. gRPC 클라이언트는 쿠키도,
CSRF 토큰도, 폼 바디도 보내지 않습니다. 그래서 `laravel-spawn`의 `gRPC`는
`Kernel`을 완전히 우회하며, 설정 파일을 통해 구성되는 별도의 경로를 사용합니다.

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

핸들러 자체는 컨테이너를 통해 리졸브되므로(평범한 생성자 DI가 여전히
동작합니다), 메서드 시그니처는 서버 시리즈 10장에서 본 것과 같은
원시 객체 쌍입니다.

```php
namespace App\Grpc;

use Profile\GetProfileRequest;
use Profile\Profile;
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

class ProfileServiceHandler
{
    public function __construct(private readonly UserRepository $users) {}

    public function getProfile(HttpRequest $req, HttpResponse $res): void
    {
        $getProfile = new GetProfileRequest();
        $getProfile->mergeFromString($req->readMessage());

        $user = $this->users->find($getProfile->getUserId());

        $profile = (new Profile())
            ->setId($user->id)
            ->setName($user->name)
            ->setRegion($user->region);

        $res->writeMessage($profile->serializeToString());
        // 그냥 return: 서버가 스스로 grpc-status: 0 (OK)을 붙입니다
    }
}
```

`$this->users`는 생성자를 통해 들어왔습니다. 여느 Laravel 서비스와
마찬가지입니다. Laravel의 라우팅이 이 경로를 전혀 건드리지 않았음에도
컨테이너와 DI는 여전히 완전히 작동합니다. 에러는 평범한 `TrueAsync Server`와
같은 방식으로 전달됩니다. HTTP 상태 코드가 아니라 `grpc-status` 트레일러를
통해서입니다.

```php
public function getProfile(HttpRequest $req, HttpResponse $res): void
{
    if (!$this->authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        return;
    }

    // ...
}
```

핸들러에서 던져진 예외는 `laravel-spawn`이 스스로 `grpc-status: 13`
(`INTERNAL`)으로 바꿔줍니다. 순수 서버가 가지고 있던 것과 동일한 동작이며,
이제는 어댑터 안에 감춰져 있을 뿐입니다.

## 여기서 무엇이 실제이고 무엇이 아닌가

두 경로 모두 Symfony의 `StreamedResponse` 위에 덧씌운 에뮬레이션이나
꼼수가 아닙니다. 둘 다 서버 시리즈에서 나온 바로 그 `HttpRequest`/`HttpResponse`
원시 타입에 대한 직접 접근이며, Laravel 라우트 바로 아래에서 이루어집니다.
비용은 예측 가능합니다: SSE 핸들러는 익숙한 `return response()->json(...)`으로
응답하지 않습니다. 스스로 쓰고, 스스로 연결을 언제 닫을지 결정합니다.
gRPC 핸들러는 Laravel의 미들웨어나 라우팅을 전혀 보지 못하고, DI를 위한
컨테이너만 봅니다. 여기엔 어떤 흑마법도 없지만 위장도 없습니다. 진짜
스트림이 필요하다면, 버퍼링된 `Response`의 안락한 세계를 벗어나 서버
자체가 사는 곳으로 발을 내디뎌야 합니다.

지금까지 Laravel이 할 수 있는 것을 다뤘습니다: 평범한 요청, 스트림, gRPC.
이제 남은 것은 Laravel이 스스로 할 수 없는 것, 그리고 병행 코루틴에
넘기기 전에 여러분 자신의 코드와 다른 사람들의 코드에서 면밀히 살펴봐야
할 것들입니다. 그것이 다음 장에서 다룰 내용입니다.
