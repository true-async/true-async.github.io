---
layout: tutorial
lang: ko
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /ko/tutors-server/03-concurrency-inside.html
page_title: "요청 내부의 동시성"
description: "핸들러 안의 TaskGroup, 부하 상황의 PDO Pool, 그리고 request_context()."
---

# 요청 내부의 동시성

이전 장에서 `showProfile`은 프로필을 한 줄로 로드했고, 저는 그 뒤에
아무것도 없는 척 솔직하지 못하게 굴었습니다. 이제 털어놓을
때입니다. 그 뒤에는 세 개의 출처가 있습니다. 데이터베이스의 사용자
데이터, 데이터베이스의 주문, 외부 API의 리뷰. 데이터를 향한 세 번의
독립적인 여정입니다.

익숙한 문제인가요? 물론입니다. 이것은 첫 번째 시리즈의 10장을
그대로 옮긴 것이며, 해법은 단 한 군데도 바꾸지 않고 그대로 가져옵니다.

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

세 요청은 병행으로 나갑니다. 페이지는 세 출처를 합한 시간이 아니라,
가장 느린 출처의 시간에 조립됩니다. 타임아웃이 있고, fail-together가
있고, `CompositeException`이 있습니다.

여기서 한 가지를 느끼는 것이 중요합니다. 서버는 자신만의 동시성
규칙을 전혀 도입하지 않았습니다. 하나도 말이죠. 핸들러는 평범한
코루틴이며, 그 안에서는 여러분이 이미 아는 모든 것이 동작합니다.
서버는 그저 HTTP 요청이 여러분이 이미 아는 세계로 발을 들이는 문을
열어 주었을 뿐입니다.

## 실제 부하 상황의 풀

첫 번째 시리즈의 9장을 기억하시나요? 열 개의 임포트 워커, 하나의
`PDO` 객체, 얽힌 트랜잭션, 혼돈. 그때는 코루틴 열 개짜리 교육용
예시였습니다. 자, 이제 열 개는 잊어버리세요.

서버에서는 현재 처리 중인 요청의 수만큼 병행 데이터베이스 사용자가
있습니다. 스무 개. 오백 개. 트래픽이 몰고 오는 만큼이며, 여러분은 그
수를 통제하지 못합니다. 여러분을 구해 주는 유일한 것은, 이미
알고 있습니다.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

작동 방식은 이전과 같습니다. 각 코루틴은 자신의 순간에 연결을
독점적으로 소유하고, 트랜잭션은 고정되며, 끊긴 연결은 조용히 새것으로
교체됩니다. 그런데 `POOL_MAX`에는 이제 새로운 역할이 있습니다. 폭풍과
데이터베이스 사이의 퓨즈가 된 것입니다. 천 개의 병행 요청은 열여섯
개의 연결을 위해 대기열에 줄을 섭니다. 인정하세요, 천 개의 연결이
한꺼번에 PostgreSQL에 도착하는 것보다는 낫습니다.

## 이건 누구의 요청인가?

첫 번째 시리즈의 15장은 "현재의" 것, 즉 사용자, 로케일, 요청 식별자를
어디에 저장할 것인가 하는 질문으로 끝났습니다. 그때 우리는 그 답을
컨텍스트 위에 세웠습니다. 서버는 이 이야기를 끝까지 밀고 가며, 그것도
아름답게 해냅니다.

각 핸들러는 자신만의 스코프에서 실행됩니다. 그리고 요청 스코프에는
그 요청의 코루틴 트리 전체에 걸쳐 공유되는 컨텍스트가 있습니다.

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... 심지어 열 단계나 깊은 호출 안에서도 ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo`는 핸들러에서 호출될 수 있습니다. 핸들러가 spawn한 코루틴에서.
서비스 안, 리포지토리 안, `TaskGroup` 안의 코루틴에서도. 상관없습니다.
`request_context()`는 우리가 이 요청 안에 있는 한 어디서나 동일합니다.
그리고 지금 우리 것과 번갈아 처리되고 있는 이웃 요청은요? 그것은 자기
것을 가집니다. 삼백 개의 병행 요청, 삼백 개의 독립적인 `request_id`,
전역 변수 제로.

`current_context()`와의 차이는 이제 한 줄로 표현할 수 있습니다. 그것은
코루틴 하나에 관한 것이고, 이것은 요청 전체에 관한 것입니다.

## 스코프가 요청 후 뒷정리를 합니다

그리고 마지막 결과, 가장 눈에 띄지 않으면서도 가장 값진 것입니다.
핸들러가 스코프 안에서 살기 때문에, 첫 번째 시리즈의 8장 전체가 여러분
쪽의 단 한 가지 행동도 없이 요청에 자동으로 적용됩니다.

코루틴을 spawn하고 await하는 것을 잊었나요? 요청이 끝나면 스코프가
뒷정리를 합니다. 클라이언트가 도중에 연결을 끊었나요? 서버가 요청
스코프를 취소하고, 취소가 협력적으로 모든 자식 코루틴에 도달하며, 모든
`finally`가 각자의 것을 해제합니다. 구조적 동시성이 얼마나 많은 규율을
요구했는지 기억하시나요? 여기서 그것은 더 이상 규율이 아니게 되었습니다.
이제 그것은 플랫폼의 속성입니다. 어떤 요청 코루틴의 수명이든 요청 그
자체로 한정됩니다. 이상 끝.

서버의 보이지 않는 부분은 여기까지입니다. 다음에는 바이트가, 그것도
잔뜩 등장합니다. 클라이언트는 1기가바이트 파일을 업로드하고, 우리는
2기가바이트 리포트를 돌려줍니다. OOM 킬러를 깨우지 않으려면 이 모든
것을 어디에 두어야 할까요? 다음 장이 바로 그것에 관한 것입니다.
