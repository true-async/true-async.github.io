---
layout: tutorial
lang: ko
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /ko/tutors/06-future.html
page_title: "Future"
description: "Future와 FutureState: 코루틴에 묶이지 않은 결과의 약속."
---

# Future

앞 장에서 우리는 코루틴이 결과의 약속처럼 동작한다는 것을 알게 되었습니다.
`await`는 원하는 만큼 여러 번 호출할 수 있고, 언제나 같은 값을 반환합니다.
하지만 코루틴에는 엄격한 제약이 하나 있습니다. 결과는 항상 `spawn`이 시작한
함수가 만들어 낸다는 점입니다. 하나의 호출, 하나의 함수, 하나의 결과입니다.

그런데 만약 결과가 애초에 함수에서 나오지 않는다면 어떨까요?

다시 `ProfileService`로 돌아가 봅시다. 사용자가 배송 주소를 변경하는데,
저장하기 전에 그 주소를 `GeoDirectory` 서비스가 담당하는 지역 디렉터리와
대조해서 확인해야 합니다.

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

이 디렉터리는 크고, 로드가 느리며, 누구에게나 동일합니다. 동시에 모든
프로필 업데이트 요청에서 이 디렉터리가 필요하고, 요청은 병행으로 처리됩니다.
각 요청에서 `spawn(loadRegions(...))`를 호출하면 동일한 답을 얻기 위해
동일한 요청으로 `GeoDirectory`를 폭격하는 셈입니다. 낭비입니다.

우리가 원하는 것은 첫 번째 요청만 실제로 디렉터리를 로드하고, 나머지 요청은
모두 그 결과를 기다리는 것입니다. 그러려면 한쪽 코드가 결과를 넣어두고
다른 쪽 코드가 그것을 집어 갈 수 있는 장소가 필요합니다.

그 장소가 바로 `Future`가 될 수 있습니다.

## FutureState와 Future

`Future`는 결과에 대한 약속이자 결과를 담는 컨테이너입니다. 코루틴에 묶여
있지 않지만, 우리가 이미 알고 있는 `await`와 함께 동작합니다.

`Future`는 두 개의 객체로 구성됩니다.

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — 결과를 씁니다. 결과를 생산하는 쪽이 계속 가지고 있습니다.
- **`Future`** — 결과를 읽습니다. 결과를 기다리는 쪽에게 건네집니다.

생산자는 작업을 완료하고, 소비자는 익숙한 `await`로 그것을 기다립니다.

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

왜 하나가 아니라 두 개의 객체일까요? 이렇게 나눔으로써 실수를 방지합니다.
`Future`를 가진 쪽은 물리적으로 작업을 완료할 수 없습니다. 그런 메서드가
없기 때문입니다. 오직 `FutureState`의 소유자만 결과를 쓸 수 있으며,
그것도 단 한 번만 가능합니다.

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

작업이 실패하면 결과 대신 예외가 기록되고, 기다리고 있던 모든 쪽에게
`await`가 그 예외를 던집니다.

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## 디렉터리 문제 해결하기

이제 병행 요청들이 서로 공유하는 디렉터리 로딩을 만들 수 있습니다.

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

`regions`의 첫 번째 호출은 실제 로딩을 수행하는 코루틴을 시작합니다.
이후의 모든 호출은 같은 `Future`를 받아 하나의 공유된 결과를 기다립니다.
디렉터리가 로드되고 나면, 아무리 여러 번 물어도 `await`는 즉시 그것을
반환하기 시작합니다.

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

병행으로 처리되는 요청이 아무리 많아도 `GeoDirectory`는 정확히 한 번만
호출되며, `RegionsDirectory`는 평범한 서비스로 남습니다. DI 컨테이너에
연결할 수 있고, 테스트에서 교체할 수 있으며, 모든 상태는 하나의 `$future`
필드에 담깁니다. `await`가 코루틴과 `Future`에 대해 똑같이 동작한다는 점에
주목하세요. 앞 장의 타임아웃까지도 마찬가지입니다.

```php
$regions = await($directory->regions(), timeout(2000));
```

## 이미 가지고 있는 결과

때로는 결과를 미리 알고 있기도 합니다. 예를 들어 지역 디렉터리가 서비스
시작 시점에 워밍업되어 이미 메모리에 올라와 있는 경우입니다. 이미 알고 있는
값을 위해 굳이 `FutureState`와 코루틴을 만들 이유가 없으므로, 이를 위한
팩토리 메서드가 있습니다.

```php
// 결과가 이미 준비되어 있음
$future = Future::completed($regionsFromWarmup);

// 오류가 이미 알려져 있음
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

`regions` 메서드는 이러한 `Future`를 반환할 수 있고, 소비자는 차이를
전혀 알아채지 못합니다. 여전히 `await`를 호출하고 즉시 결과를 얻습니다.

## 고전적인 기법: 메모이제이션

`RegionsDirectory`는 이미 메모이제이션이라는 고전적인 기법을 구현하고
있습니다. 결과를 한 번 계산해 두고 반복되는 모든 호출에 나눠주는 것입니다.
이 기법은 인자를 받는 어떤 함수에도 감쌀 수 있을 만큼 범용적입니다.

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // GeoDirectory로의 요청
$fr = await($regionsOf('FR')); // GeoDirectory로의 요청
$de = await($regionsOf('DE')); // 즉시, 캐시에서
```

한 가지 미묘한 점에 주목하세요. 캐시에는 평범한 값이 아니라 `Future`
자체가 담깁니다. 병행 코드에서 순진하게 만든 메모이제이션은 경쟁 상태에
시달릴 수 있습니다. 첫 번째 호출이 `GeoDirectory`의 답을 기다리는 동안,
두 번째 호출이 캐시를 확인하고 비어 있는 것을 보고서 중복 요청을 쏘아
버리는 것입니다. 여기에는 그런 틈이 없습니다. 계산이 시작되기도 전에
`Future`가 즉시 캐시에 들어가므로, 두 번째 호출은 그것을 발견하고 그저
기다립니다.

이 기법에는 경계가 있습니다. 메모이제이션은 프로세스가 살아 있는 동안
변하지 않는 데이터에만 유효합니다. 토큰 검증 결과나 환율을 이런 식으로
캐싱하는 것은 실수입니다. 그것들은 시간에 의존하므로, 이런 캐시에는 결과를
다시 가져오게 만드는 수명이 필요합니다. 같은 이유로 오류는 별도로 고민할
가치가 있습니다. 실패한 `Future`도 영원히 캐시에 남게 되는데, 대개는 다음
호출이 재시도할 수 있도록 그것을 제거하는 편이 낫습니다.

이 장에서 가져갈 핵심은 이렇습니다. 코루틴은 "결과를 어떻게 얻는가"라는
질문에 답하고, `Future`는 단지 결과가 존재할 것이라고 약속할 뿐입니다.
그 결과가 어디에서 오는지, 코루틴인지 캐시인지 다른 스레드인지는 소비자가
알 바가 아닙니다. 생산자와 소비자는 결과에 대해서만 합의했을 뿐, 서로에
대해서는 아무것도 모릅니다.

그런데 만약 결과가 하나가 아니라, 코루틴에서 코루틴으로 전달되어야 하는
값들의 스트림 전체라면 어떨까요? 그것을 위한 별도의 도구가 있으며, 그것이
다음 장의 주제입니다.
