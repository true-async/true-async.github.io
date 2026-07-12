---
layout: tutorial
lang: ko
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /ko/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup: 결과를 가진 작업 그룹, 그리고 all, race, any 대기 전략."
---

# TaskGroup

사용자 프로필 페이지가 세 개의 출처로 조립된다고 가정해 봅시다.
데이터베이스의 사용자 데이터, 데이터베이스의 주문, 외부 API의 리뷰입니다.
이 출처들은 서로 의존하지 않으므로 병행으로 요청되어야 합니다. 우리는 이미
이것을 하는 법을 알고 있습니다.

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

작업이 세 개라면 참을 만합니다. 하지만 자세히 보세요. 이것은 또다시
`Scope`를 다룬 장에서 나온 수동 장부 관리인데, 이번에는 결과까지
필요합니다. 모든 코루틴을 기억하고 `await`해야 하며, `fetchUser`가 예외를
던지면 `fetchOrders`와 `fetchReviews`는 헛되이 계속 돌아갑니다. `catch`
안에서 그것들을 "손으로" 취소해야 하겠죠.

그리고 수동 접근이 정말로 고통스러워지는 작업들이 있습니다. 예를 들어,
가장 먼저 끝나는 코루틴의 결과를 취하고 나머지를 취소하는 것입니다.
`await`를 루프 안에서 써서 그것을 작성해 보면 검사와 취소가 뒤엉킨 덩어리로
끝나고 말 것입니다.

여기서는 `Scope`도 큰 도움이 되지 못합니다. 그것은 코루틴의 수명을
관리하지만, 그 결과에 대해서는 아무것도 모릅니다. 더 높은 수준의 기본
요소가 필요합니다.

## 작업의 그룹

`TaskGroup`은 작업들을 하나의 전체로 묶습니다. 자기만의 `Scope`에서
그것들을 실행하고, 결과를 저장하며, 그룹을 하나의 단위로 기다릴 수 있게
해줍니다.

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

`all()` 메서드는 익숙한 `Future`를 반환하며, 이 `Future`는 모든 작업이
끝나면 결과 배열로 resolve됩니다. 우리는 `spawnWithKey`를 통해 키를 직접
지정했으므로, 배열은 평범한 인덱스 대신 이름 붙은 항목을 담습니다.

그리고 이것은 `Future`이므로, 언제나 그렇듯 같은 토큰을 통해 타임아웃이
공짜로 딸려 옵니다.

```php
$data = $group->all()->await(timeout(5000));
```

작업이 하나라도 예외를 던지면 그룹은 여덟 번째 장의 Scope처럼 동작합니다.
남은 작업들이 취소되고, `await`는 모든 오류를 담은 `CompositeException`을
던집니다. 그룹은 전부를 모으거나 아무것도 모으지 않으며, 중간 상태는
없습니다.

## 가장 먼저 끝나기: race

`all()`은 대기 전략 중 하나일 뿐입니다. `GeoDirectory`를 다시 떠올려
보세요. 그것에는 세 개의 복제본이 있고, 그중 하나는 때때로 느립니다.
고전적인 요령은 이렇습니다. 모든 복제본에 요청을 보내고 가장 먼저 오는 답을
취하는 것입니다.

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()`는 성공이든 실패든 가장 먼저 끝나는 작업의 결과로 resolve됩니다.
손으로 작성하기 그토록 고통스러운, 바로 그 "가장 먼저 오는 것을 취하고
나머지는 기다리지 않는다" 시나리오입니다.

## 가장 먼저 성공하기: any

`race()`에는 날카로운 모서리가 있습니다. 가장 먼저 끝난 작업이 하필 실패한
것이라면 그 예외를 받게 됩니다. 때로는 더 부드러운 것이 필요합니다. 여러
제공자를 시도하고 실패는 못 본 척하며 가장 먼저 성공한 답을 취하는
것입니다.

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()`는 실패를 무시하고 가장 먼저 이긴 것을 반환합니다. 모든 작업이
실패했을 때만 예외를 받게 되며, 그것은 원인의 전체 목록을 담은
`CompositeException`입니다. `suppressErrors()` 호출에 주목하세요. 진
제공자들의 오류를 아무도 처리하지 않았고, 그룹은 그것이 의도적이었다는
명시적인 확인을 원합니다. 예외를 다룬 장에서 나온 익숙한 원칙입니다.
오류는 그냥 조용히 사라질 수 없습니다.

## 동시성 한계

이제 예상치 못한 것을 봅시다. 채널을 다룬 장의 워커 풀을 기억하시나요?
채널, 열 개의 코루틴, `recv` 루프 말입니다. `TaskGroup`은 같은 것을 몇
줄로 해낼 수 있습니다.

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // 결과가 준비되는 대로 도착함
}
```

`concurrency: 10` 매개변수는 한 번에 몇 개의 작업이 실행되는지를 제한합니다.
나머지는 줄을 서서 기다리며, 슬롯이 비기 전까지는 코루틴을 띄우지조차
않습니다. `close()`는 채널에서와 같은 역할을 합니다. 새 작업이 더 오지
않는다고 알립니다. 그리고 `foreach`는 그룹 전체가 끝나기를 기다리지 않고,
결과가 준비되는 대로 나눠줍니다.

그러면 채널은 애초에 필요하지 않았다는 뜻일까요? 아닙니다. 채널은 무엇이든
만들어 낼 수 있는 동기화 기본 요소입니다. `TaskGroup`은 가장 흔한 경우,
즉 "일련의 작업을 실행하고 결과를 얻는다"를 위한 이미 완성된 조립품입니다.
작업이 그 패턴에 들어맞으면 `TaskGroup`을 손에 쥐고, 비표준적인 토폴로지가
필요하면 채널과 Scope가 여전히 여러분의 손안에 있습니다.

결론적으로 `TaskGroup`은 Scope에 결과를 더한 것입니다. 작업의 그룹이 하나의
값으로 바뀌어, 전부를 한꺼번에, 가장 먼저 끝난 것을, 또는 가장 먼저 성공한
것을 물어볼 수 있습니다.

마지막 세부 사항이 하나 있습니다. `TaskGroup`은 모든 결과를 조심스럽게
간직합니다. `race()`를 두 번 호출하면 두 번 모두 같은 답을 얻습니다.
`foreach`로 그룹을 다시 순회하면, 처음부터 모든 것을 다시 한 번 나눠줍니다.
프로필 페이지에는 이것이 편리합니다. 이제 십만 개의 작업을 그룹을 통해
돌리는 파이프라인을 상상해 보세요. 그룹이 기억하는 모든 것이 메모리에
살아 있습니다. 함정이 보이시나요? 그것이 다음 장에서 이야기할 내용입니다.
