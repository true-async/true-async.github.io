---
layout: tutorial
lang: ko
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /ko/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool: 헬스 체크와 서킷 브레이커를 갖춘 범용 리소스 풀."
---

# Pool

PDO Pool 장에서 우리는 채널 기반 풀을 여섯 줄로 스케치했지만, 곧바로 그것이 현실에서는
순진하다는 것을 인정했어요. 어떤 결과가 나오든 리소스를 반드시 반납하고, 망가진 연결을
알아채고, 죽은 것을 교체해야 하니까요. PDO에서는 코어가 그 모든 것을 우리 대신 해
주었죠. 하지만 `checkAddress`는 HTTP로 `GeoDirectory`와 통신하며, 요청마다 새 연결을
여는 것 역시 낭비일 거예요. 게다가 내일은 캐싱을 위한 Redis와 이메일을 위한 SMTP도
생길 겁니다.

설마 리소스마다 채널 풀을 손수 만들 생각은 아니겠죠. 맞아요, 이를 위한 완성된
프리미티브가 있으며, 바로 그것이 PDO Pool의 내부에서 일하고 있어요. `Async\Pool`입니다.

## 팩토리와 소멸자

풀은 자기가 어떤 종류의 리소스를 쥐고 있는지 몰라요. 여러분이 두 가지를 알려 줍니다.
리소스를 어떻게 만들고 어떻게 파괴하는지죠.

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2`는 연결 두 개를 미리 열어 두어서, 첫 코루틴들이 핸드셰이크를 기다리지 않도록
한다는 뜻이에요. `max: 10`은 아무리 많은 코루틴이 요청하더라도 풀이 연결을 열 개보다
많이 만들지 않는다는 뜻이고요. 익숙한 동시성 제한이지만, 이제는 그것이 워커 수가 아니라
리소스 자체에 묶여 있어요.

다음은 우리가 이미 채널로 손수 만들었던 그 순환입니다.

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire`는 비어 있는 리소스를 내줍니다. 비어 있는 것이 없고 제한에 도달하지 않았다면
팩토리가 새것을 만들어요. 제한에 도달했다면 코루틴은 누군가 `release`를 호출할 때까지
잠들어요. 빈 채널에서의 `recv`와 같은 메커니즘이죠. `finally`에 주목하세요. 예외나
취소를 포함해 어떤 결과가 나오든 리소스는 반납됩니다. 바로 그 지점에서 우리가 손수 만든
풀이 넘어지곤 했어요.

평소처럼 제한을 두고 기다릴 수도 있어요.

```php
$conn = $geo->acquire(timeout: 3000); // 3초 안에 오지 않으면 TimeoutException
```

## 리소스는 죽는다

풀에서 반 시간 동안 놓여 있던 연결은 조용히 죽었을 수도 있어요. 서버가 타임아웃 후에
닫았거나 네트워크가 깜빡했을 수 있죠. PDO 장에서 그것이 무엇으로 이어지는지 이미
봤어요. 다음 코루틴이 난데없이 알 수 없는 오류를 받게 됩니다. 풀은 이것을 세 갈래로
막아요.

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — 30초마다 풀이 스스로 비어 있는 리소스들을 돌며 맥박을 확인해요.
  죽은 것은 파괴되고 새것으로 교체됩니다.
- **`beforeAcquire`** — 리소스를 내주기 직전의 마지막 확인입니다. 실패하면 그 리소스는
  파괴되고 코루틴은 다음 것을 받아요.
- **`beforeRelease`** — 반납할 때의 확인입니다. 코루틴이 요청 도중에 연결을 망가뜨렸을
  수 있으니, 그런 리소스는 풀로 되돌아가지 않아요.

코루틴은 이 무대 뒤의 일에 대해 아무것도 몰라요. 리소스를 요청하면 동작하는 것을 받죠.
헬스 관리는 코드 곳곳에 `if` 더미로 발려 있는 대신 생성자에서 선언적으로 표현됩니다.

## 서킷 브레이커

이제 `GeoDirectory`가 완전히 다운되었다고 상상해 봐요. 열 개의 연결이 모두 죽었고, 모든
코루틴이 성실하게 타임아웃을 기다렸다가, 새 연결을 만들고, 다시 기다립니다. 애플리케이션은
이미 다운된 서비스를 두들기는 데 온 힘을 쏟고, 그렇게 함으로써 그 서비스가 다시 일어서지
못하게 막아요.

전기공학은 바로 이것을 위한 해법을 발명했어요. 결함이 해소될 때까지 회로를 여는
차단기죠. 이 패턴은 그 이름을 따서 서킷 브레이커라고 부르며, 풀에 내장되어 있어요.
풀에는 세 가지 상태가 있어요. 모든 것이 동작하는 `ACTIVE`, 서비스가 이용 불가로
선언되어 `acquire`가 아무 타임아웃 없이 즉시 실패하는 `INACTIVE`, 그리고 서비스가 다시
살아났는지 조심스럽게 확인하는 `RECOVERING`입니다.

상태는 손수 전환할 수도 있고, 결정을 전략에 맡길 수도 있어요.

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // 첫 기회가 오면 복구를 시도한다
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

풀은 리소스의 성공과 실패를 하나하나 전략에 보고하고, `shouldRecover`를 통해 서비스가
돌아왔는지 조심스럽게 확인할 때가 되었는지 물어봐요. 연속 다섯 번 실패하면 회로가
열립니다. 코루틴은 타임아웃이라는 느린 고문 대신 빠른 실패를 받고, `GeoDirectory`는
의미 없는 타격을 그만 받고 평화롭게 회복할 수 있게 됩니다.

돌아보면 `Pool`은 아홉 번째 장에서 우리가 채널로 손수 만든 것을 정확히 해내며, 손수
만들고 싶지 않은 모든 것을 더해 줍니다. 반납 보장, 헬스 체크, 서킷 브레이커죠. `PDO
Pool`은 같은 프리미티브인데, 그저 `PDO` 파사드 뒤에 감춰져 있을 뿐이에요. 그리고 나머지
모든 것, 즉 HTTP 클라이언트, Redis, 소켓, 그리고 일반적으로 무거운 객체를 위해서는
`Async\Pool`이 있습니다.

이 지점에 이르니 우리의 무기고가 인상적으로 보여요. 코루틴, 채널, 스코프, 작업 그룹,
풀. 하지만 이 모든 것은 단 하나의 운영체제 스레드에서 실행되고 단 하나의 CPU 코어를
공유합니다. 작업이 I/O를 기다리는 동안에는 그것이 누구에게도 문제가 되지 않아요. 하지만
일이 기다림이 아니라 계산에 묶여 있다면 어떨까요? 거기서는 전체 그림이 바뀌며, 바로
그것이 다음 장의 주제입니다.
