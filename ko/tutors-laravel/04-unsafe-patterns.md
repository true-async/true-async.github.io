---
layout: tutorial
lang: ko
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /ko/tutors-laravel/04-unsafe-patterns.html
page_title: "코루틴 안에서 할 수 없는 일"
description: "가변 static 속성, 싱글턴 위의 once(), Number::useLocale(): 요청 간 상태가 흔히 새는 방식과 정적 분석으로 이를 잡아내는 방법."
---

# 코루틴 안에서 할 수 없는 일

앞선 장들은 구체적인 상태 누수를 고쳤습니다: `auth`/`session`은
컨텍스트를 통해, 트랜잭션 카운터는 트레이트를 통해. `laravel-spawn`이
이 구멍들을 대신 막아주었습니다. 하지만 프레임워크는 크고, 서드파티
패키지는 그보다 훨씬 더 많으며, 내일이면 팀의 누군가가 자신만의
서비스를 작성할 것입니다. 필요한 것은 한눈에 적용할 수 있는 규칙,
즉 병행 코루틴에 안전한 코드와 언젠가 한 사용자에게 다른 사람의
데이터를 넘겨줄 코드를 구별하는 규칙입니다.

## 하나의 규칙: 시작 이후에는 static에 쓰지 마라

아래의 모든 예시는 같은 실수의 특수한 경우입니다: 프로세스의 모든
코루틴이 공유하는 메모리에 값이 기록되는데, 그 값은 특정 요청 하나에
속한 것입니다.

**서비스의 가변 static 속성.**

```php
// 위험함
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

무해한 메모이제이션처럼 보입니다. 실제로는 모든 코루틴이 공유하는
배열입니다. `computeExpensive()`가 요청마다 달라지는 무언가에
의존한다면(사용자의 통화, 지역별 마크업 등), 첫 번째 요청이 이후
모든 요청의 캐시 운명을 결정해버립니다. 해결책은 간단합니다: `static`
대신 인스턴스 속성을 쓰고, 서비스를 요청마다 리졸브하면 됩니다
(1장의 "접근법 1").

**만약 서비스가 여러분 자신의 것이고, 요청별 상태가 의도적으로
필요하다면?** `laravel-spawn`이 `ScopedService`와 그 프록시를 제공해줄
때까지 기다릴 필요는 없습니다. 이것은 2장에서 트랜잭션 카운터 문제를
해결한 것과 같은 방법이며, 한 단계 위로 올라간 것뿐입니다. 단일
코루틴을 위한 `coroutine_context()`가 아니라 요청 전체 코루틴 트리가
공유하는 `request_context()`를 씁니다.

```php
class PriceCalculator  // 여전히 싱글턴
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

이전 예시와의 차이는 작아 보이지만 근본적입니다. 배열이 더 이상
프로세스 전체가 공유하는 클래스 단위의 `static` 속성에 살지 않고,
특정 요청 하나의 스코프 컨텍스트에 삽니다. 두 병행 요청이 정확히
같은 `PriceCalculator` 인스턴스를 호출하지만, 각각은 자신만의
`$cache`를 얻습니다. `request_context()`가 각각에 대해 다른 스코프로
리졸브되기 때문입니다. `coroutine_context()`와 `request_context()`에
대한 자세한 내용은 [2장](/ko/tutors-laravel/02-pool-transactions.html)에
있습니다.

**싱글턴 위의 `once()`.**

```php
// 위험함
class CurrentUserService  // 싱글턴으로 등록됨
{
    public function get()
    {
        return once(fn() => Auth::user());  // 첫 번째 사용자를 영원히 캐시함
    }
}
```

`once()`는 클로저의 결과를 그 호출이 속한 객체를 키로 하는 `WeakMap`에
캐시합니다. 싱글턴에서는 그 객체가 프로세스 전체에 하나뿐이므로, 캐시도
하나뿐입니다. 첫 번째 요청이 사용자를 계산하면, 그 뒤의 모든 요청은
같은 사용자를 받게 됩니다. 요청별 객체(컨트롤러, `Eloquent` 모델)에서는
`once()`가 완전히 안전한데, 그곳에서는 객체 자체가 매 요청마다 새롭기
때문입니다.

**`Number::useLocale()` 같은 전역 변이.**

```php
// 위험함
Number::useLocale('de');
$price = Number::format(1234.5);       // 이 줄 전에 코루틴이 잠들면 어떻게 될까?

// 안전함
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()`은 `Number` 클래스의 static 변수를 변경합니다. `useLocale()`
호출과 `format()` 사이에는 `await`, `delay()`, 데이터베이스 왕복 등 어떤
일도 일어날 수 있습니다. 즉 스케줄러가 다른 코루틴에 제어를 넘기는
지점이 생길 수 있습니다. 만약 그 코루틴도 명시적인 locale 없이
`Number::format()`을 호출한다면, 방금 다른 누군가가 설정한 locale을
받게 됩니다. 명시적인 `locale:` 매개변수는 경쟁의 가능성을 완전히
제거합니다. 보호할 것이 아무것도 없기 때문입니다. 공유할 것 자체가
없으니까요.

**슈퍼글로벌.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION`은 PHP-FPM
아래에서는 단지 하나의 요청 동안만 살아 있었기 때문에 안전했습니다.
코루틴 워커에서는 이들이 프로세스 전체가 공유하는 변수이며, 매 새
연결마다 PHP가 아니라 서버가 이를 업데이트합니다, 여러분이 익숙한
방식과는 다릅니다. `laravel-spawn`이 이미 `current_context()`를 통해
격리해 둔 `Request` 객체를 사용하고, 슈퍼글로벌은 건드리지 마세요.

## static이 실제로 안전한 경우

극단으로 치우쳐서 모든 `static`을 범죄로 선언하지 않는 것도 마찬가지로
중요합니다. 다음은 안전합니다.

- **`readonly static`**, 값이 초기화 이후 절대 바뀌지 않는다면, 코루틴
  사이에서 공유하는 것은 상수를 공유하는 것보다 더 위험하지 않습니다.
- **부팅 시점 설정**, 워커가 시작될 때 한 번 설정되고 그 이후로는
  읽히기만 하는 `static`(라우트, 컴파일된 템플릿, 등록된 매크로).
- **결정적 캐시**, 결과가 "현재" 요청이 아니라 오직 입력 인자에만
  의존한다면(가령 주어진 문자열에 대한 `Str::camel()` 캐시는 항상 같은
  문자열입니다), 캐시를 채우는 경쟁이 일어나도 데이터가 손상되지
  않습니다. 최악의 경우 두 번 계산될 뿐입니다.
- **의미 없는 단조 카운터**, 고유한 SQL 별칭을 위한 내부 카운터 같은
  자동 증가 alias는, 두 요청이 같은 숫자를 잡더라도 충돌이 잘못된
  데이터를 만들지 않습니다. 기껏해야 덜 예쁜 별칭이 될 뿐입니다.

차이는 항상 같습니다: 공유되는 것이 *요청에 의존하지 않는 계산 결과*인가,
아니면 *특정 요청 하나에 속하는 상태*인가? 전자는 최적화입니다.
후자는 누수입니다.

## 꼼꼼히 읽는 대신 정적 분석

`readonly`가 없는 `private static`을 찾겠다고 모든 서드파티 패키지를
수동으로 스크롤하는 것은 기꺼이 린터에게 넘길 만한 작업입니다. 이
패키지는 바로 이 용도로 만들어진 `PHPStan` 규칙을 제공합니다.

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

        // ... "코루틴 간 잠재적 상태 누수" 메시지
    }
}
```

이 규칙은 최대한 단순합니다. `readonly` 수식어가 없는 모든 `static`
속성을 찾아 표시합니다. 위에서 언급한 "안전한" 경우들처럼 상당수의
오탐이 나올 것입니다. 하지만 이것은 의도적인 트레이드오프입니다.
실제 누수를 놓치는 것이 후보 목록을 한 번 수작업으로 정리하는 것보다
더 비쌉니다.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

이 규칙을 Laravel 프레임워크 자체에 돌려보면 300건이 넘는 결과가
나옵니다. 압도적 다수는 앞 절에서 다룬 안전한 `static`들입니다.
컴파일된 `BladeCompiler` 캐시, `boot()`에서 한 번 설정되는 설정
플래그, 이미 격리된 `$app['request']`에 내부적으로 접근하는
리졸버 등입니다. 300줄을 한 번 정리하는 데는 15분 정도 걸립니다.
하나라도 놓쳐서 프로덕션에서 누수를 겪는 것은, "다른 사용자의
프로필이 보여요"라는 버그 리포트를 몇 시간 동안 디버깅하는 것을
의미합니다.

## 결론

요청 핸들러 안에서 실행되는 코드에 `static`(혹은 가변 속성을 가진
싱글턴)을 남기기 전에 한 가지 질문을 던지세요: 이 값이 현재 요청이
끝난 뒤에도 살아남고, 다음 요청에 대해서도 여전히 올바를까? 그렇다면
안전합니다. 만약 요청과 함께 만료되어야 하는데 물리적으로는 프로세스
전체가 공유하는 메모리에 계속 살아 있다면, 이것은 `ScopedService`,
`request_context()`/`coroutine_context()`([2장](/ko/tutors-laravel/02-pool-transactions.html)
참고), 혹은 요청마다 다시 만들어지는 평범한 인스턴스 속성의 후보입니다.

지금까지 여러분 자신의 코드와 기본 Laravel을 다뤘습니다. 하지만 실제
프로젝트에는 보통 `spatie/laravel-permission`, `Telescope`, `Inertia`,
`Debugbar`가 바로 옆에 함께 살고 있으며, 각각 자신만의 가변 상태의
역사를 가지고 있습니다. 그중 무엇이 이미 적응되어 있고, 비동기 모드에서
무엇을 꺼두는 것이 좋은지는 다음 장의 주제입니다.
