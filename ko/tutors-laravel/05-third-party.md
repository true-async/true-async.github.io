---
layout: tutorial
lang: ko
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /ko/tutors-laravel/05-third-party.html
page_title: "서드파티 패키지"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: 이미 코루틴에 적응된 것과 꺼두는 것이 나은 것."
---

# 서드파티 패키지

지금까지 Laravel의 코어와 여러분 자신의 코드를 다뤘습니다. 하지만 실제
프로젝트의 의존성 목록은 거기서 끝나지 않습니다. 개발 환경의 `Debugbar`,
로그를 위한 `Telescope`, 프론트엔드를 위한 `Inertia`, 역할을 위한
`spatie/laravel-permission`. 이들 모두는 하나의 프로세스 안에서 수백 개의
병행 요청이 처리되는 상황을 아무도 상상하기 훨씬 전에 작성되었고, 각각
상태를 담고 있는 자신만의 싱글턴을 가지고 있습니다. 좋은 소식은, 가장
흔한 패키지들에 대해서는 이 작업이 이미 끝나 있다는 것입니다. 나쁜
소식은, 전부가 그런 것은 아니며, 어느 쪽인지 구분할 수 있어야
한다는 것입니다.

## 이미 적응된 패키지

**`spatie/laravel-permission`.** `PermissionRegistrar`는 현재 `team ID`와
와일드카드 권한 인덱스를 자신의 속성에 보관합니다. 위험한 패턴 장에서
다룬 바로 그 패턴입니다. `AsyncPermissionRegistrar`는 이 둘을 모두
`current_context()`로 옮깁니다.

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

    // clearPermissionsCollection()은 사실상 아무 동작도 하지 않게 됩니다.
    // 권한 목록 자체는 로딩 이후 읽기 전용이며 요청 간에 안전하게 공유됩니다.
}
```

여러분 자신의 코드에서는 아무것도 바뀌지 않습니다. `Auth::user()->can(...)`,
미들웨어 안의 `setPermissionsTeamId()`, 모두 패키지 문서가 설명하는
그대로 동작합니다.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory`는 `sharedProps`,
`rootView`, `version`, `encryptHistory`를 컨텍스트로 옮깁니다. 이들은
원래 `ResponseFactory` 싱글턴의 속성에 계속 쌓이며 한 요청이 끝난 뒤에도
다음 요청까지 살아남았을 값들입니다.

**`barryvdh/laravel-debugbar`.** 여기서의 해법은 조금 더 미묘합니다.
`Debugbar`는 요청 전체에 걸쳐 데이터를 수집합니다: SQL 쿼리, 메시지,
타이밍 등, `await`에 의한 일시정지를 포함해 전체 처리 주기 동안 자기
자신에게 계속 써 넣는 전형적인 누적형 컬렉터입니다. `AsyncDebugbar`는
요청마다 새 인스턴스를 리졸브하지 않습니다(일회성 이벤트 구독이
깨지기 때문입니다). 대신 워커당 하나의 `Debugbar`를 유지하되, 그 안의
컬렉터들 자체를 컨텍스트를 인식하도록 만듭니다.

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // 이 컬렉터들은 요청 안의 모든 I/O 일시정지에 걸쳐 데이터를 누적하므로,
        // 저장소는 인스턴스 단위가 아니라 코루틴 단위여야 합니다.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

1장의 `ScopedServiceProxy`와의 차이는 중요합니다. 그곳에서는 서비스
전체가 요청마다 새로 리졸브되었지만, 여기서는 서비스가 여전히 단일
인스턴스로 남고(다시 만들기에는 비용이 큽니다: 이벤트 구독, 설정),
그 안의 특정 누적형 컬렉터들만 컨텍스트를 인식하게 됩니다. 위험한
패턴 장과 같은 진단("요청 간에 공유되는 상태에 쓰지 마라")이지만,
이 패키지의 고유한 구조에 맞춘 처방입니다.

**`laravel/telescope`.** 비슷하게: `entriesQueue`, `updatesQueue`,
`shouldRecord` 플래그가 `CoroutineSafeRecording` 트레이트를 통해
컨텍스트로 옮겨지고, 주어진 요청을 기록할지 여부는 코루틴 단위로
결정됩니다.

**`laravel/socialite`.** 여기는 더 단순합니다. `SocialiteManager`는
드라이버를 가장 먼저 도달한 요청의 설정과 함께 캐시합니다. 해결책은
어댑터가 아니라 `scopedSingleton`, 즉 1장의 "접근법 1"과 같은 것입니다.
요청마다 새로운 매니저를 만들며, 컨텍스트는 전혀 필요하지 않습니다.

## 적응 없이도 안전한 패키지

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`, `HTTP
Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, 이들도 싱글턴을
가지고 있지만, 그 안에 담긴 것은 설정과 클라이언트이지 요청별 데이터가
아닙니다. `CacheManager`는 여러분이 넣은 값이 아니라 `Redis` 클라이언트
객체를 캐시합니다. `MailManager`는 이메일이 아니라 설정된 `Mailer`를
캐시합니다. 위험한 패턴 장에서와 같은 질문입니다: 그 상태가 요청이
끝난 뒤에도 살아남으면서 여전히 올바른가? 여기서는 답이 그렇다입니다.
그 상태가 한 사용자의 데이터가 아니라 커넥션 설정이기 때문입니다.

## 호환되지 않음: 꺼두세요

**`livewire/livewire`.** 여기서는 잠시 멈추고 앞선 낙관을 이어가지
않는 것이 좋습니다. `LivewireManager`는 내부 깊숙이 요청별 상태를
누적하며, `wire:stream`은 병행 코루틴 모델 자체가 깨뜨리는 버퍼링된
일회성 응답이라는 가정 위에 세워져 있습니다. 부분적인 적응은 통하지
않았습니다. `laravel-spawn`에서도, 그 이전의 `Laravel Octane`에서도
마찬가지였습니다. 실제로 유효한 유일한 권장 사항은 비동기 모드에서
`Livewire`를 아예 활성화하지 않는 것입니다. 이 스택에서 인터랙티브한
인터페이스가 필요하다면 `Inertia`를 사용하세요. 이미 적응되어 있고
위에서 다뤘습니다. `Livewire` 위에 세워진 `Filament`도 같은 한계를
그대로 물려받습니다.

## 여러분 자신의 패키지를 결정하기

필요한 패키지가 어느 목록에도 없다면, 질문은 이전 장과 같습니다.
단지 이번엔 다른 사람의 코드를 향할 뿐입니다: 그 패키지의 싱글턴이
오직 한 요청에 대해서만 올바를 수 있는 가변 상태를 담고 있는가?
그렇다면 세 가지 길이 있고, 이들은 동등하지 않습니다.

가장 빠른 것은 설정의 `scoped_services`, "접근법 1"입니다. 패키지가
요청마다 새로 리졸브되며, 그 자체 코드는 손대지 않고 그대로 둡니다.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

다시 만드는 것이 비용이 크다면(패키지 초기화 비용이 크거나, 요청 간에
스스로 유용한 것을 캐시한다면), 이 장에서 본 `AsyncPermissionRegistrar`나
`AsyncDebugbar`의 패턴을 따라 전용 어댑터를 작성하세요: 서브클래싱하고,
`bootCompleted()`를 추가하고, 요청마다 실제로 바뀌는 것만 `current_context()`로
옮기고, 나머지는 그대로 둡니다.

그리고 만약 이것이 독립된 서비스가 아니라 `Livewire`처럼 깊이 뿌리내린
패턴이라면, 일주일 동안 적응시켰다가 그 다음 주에 `wire:stream`이
아키텍처적 이유로 깨져 있는 것을 발견하는 일은 하지 마세요. 이전 장의
`MutableStaticPropertyRule`을 패키지의 소스에 대해 돌려보세요. 결과가
수십 건에 달하고 그것들이 안전한 부팅 시점 캐시가 아니라 패키지의
핵심부를 정통으로 건드린다면, 그것은 고치라는 신호가 아니라 비동기
모드에서 배제하라는 신호입니다.

지금까지 여러분 자신의 코드, Laravel의 코어, 그리고 그 주변 생태계를
다뤘습니다. 이제 남은 것은 숫자를 직접 보는 것입니다: 이 모든 것이
갖춰졌을 때 애플리케이션이 실제로 얼마나 더 빨라지는지 말입니다.
