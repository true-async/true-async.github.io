---
layout: tutorial
lang: ko
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /ko/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet: 스스로 비워지는 작업 스트림, joinNext/joinAny/joinAll, 그리고 감독 루프."
---

# TaskSet

이전 장에서 `TaskGroup`은 모든 것을 기억한다는 사실을 확인했어요. 그것은 우연이 아니라
여러분이 의지할 수 있는 속성입니다. 그룹에 결과를 몇 번을 물어보든 항상 같은 답을
얻어요. 이 동작을 멱등성이라고 부르며, 우리는 이미 이전에도 이것을 접했어요.
코루틴에 대해 `await`를 반복하면 매번 같은 결과를 돌려줍니다.

하지만 기억에는 대가가 따릅니다. 십만 개의 작업을 그룹으로 실행하면, 각 결과가 준비된
그 순간에 단 한 번만 필요했더라도 십만 개의 결과가 모두 그 안에 남아 있어요. 몇 시간
동안 실행되는 파이프라인에서 그것은 저장이 아니라 누수입니다.

필요한 것은 정반대 성향을 가진 `TaskGroup`의 쌍둥이입니다. 결과를 넘겨주고 잊어버리는
것이죠. 그것이 바로 `TaskSet`입니다.

## 저장하지 않고 소비하기

겉보기에는 모든 것이 똑같아 보여요. `spawn`, `close`, 동시성 제한이 있죠. 차이는
결과가 전달된 다음에 그 결과에 무슨 일이 일어나느냐에 있습니다.

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, 벌써 다른 것이에요!
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, 세트가 비어 있어요
```

`joinNext()`를 호출할 때마다 다음으로 준비된 결과를 돌려주고 그 항목을 세트에서
제거합니다. 몇 번을 호출하든 언제나 같은 첫 번째 승자를 돌려주는 `TaskGroup`의
`race()`와 비교해 보세요. `TaskSet`은 저장소가 아니라 큐처럼 동작합니다. 읽으면 사라져요.
그렇습니다, 이것은 채널 장의 `recv`와 같은 의미이지만, 이제 큐가 담는 것은 값이 아니라
완료되는 작업입니다.

쌍둥이의 대기 메서드는 서로 운율이 맞아요.

- **`joinNext()`** — `race()`처럼, 가장 먼저 끝난 것, 그 항목은 제거됩니다.
- **`joinAny()`** — `any()`처럼, 가장 먼저 성공한 것, 그 항목은 제거됩니다.
- **`joinAll()`** — `all()`처럼, 모든 결과를 한꺼번에, 세트는 비워집니다.

`join` 접두사가 그 차이를 스스로 암시합니다. 결과는 단지 읽히는 것이 아니라 빠져나갑니다.

## 누수 없는 파이프라인

이제 우리가 알게 된 것으로 십만 행짜리 임포트를 다시 작성해 봐요.

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Address not verified: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

한 코루틴이 파일을 읽으며 작업을 계속 공급하고, 그동안 메인 흐름은 준비되는 대로 결과를
처리합니다. 처리된 항목은 곧바로 세트에서 제거되므로, 메모리에는 진행 중인 작업만
남아요. 실행 중인 열 개에 큐가 더해진 정도죠. 파일은 아무리 커도 되며, 메모리 사용량은
그 크기에 의존하지 않습니다.

익숙한 세부 요소들이 어떻게 새로운 그림으로 모였는지 주목해 보세요. 직접 만든 워커 풀
대신 동시성 제한, "더 이상 작업은 오지 않는다"는 신호로서의 `close()`, 조용히 삼켜진
예외 대신 `[$result, $error]` 쌍, 그리고 아홉 번째 장에서 나온, `saveAddress`에 대한
병행 호출에도 끄떡없는 `PDO`가 있죠.

## 감독자

이 소비 의미가 없어서는 안 되는 두 번째 시나리오가 있습니다. 오래 사는 작업을 지켜보다가
그것이 끝날 때 반응하는 코드예요.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Service $key stopped" . ($error ? ": {$error->getMessage()}" : ''));

    // 중단된 서비스를 재시작한다
    $set->spawnWithKey($key, restartService($key));
}
```

세트는 절대 닫히지 않으므로 `foreach`도 결코 끝나지 않고, 그저 다음 이벤트를 기다립니다.
처리된 항목은 제거되고, 재시작된 서비스가 그 자리에 다시 추가되며, 루프는 영원히 살아
있어요. 감독자는 태초부터 있었던 모든 완료의 이력이 필요하지 않아요. 정확히 이것만
필요합니다. 자신이 돌보던 것 중 하나가 멈췄으니, 왜 그런지 알아내고 재시작하는 것이죠.
이 루프는 `TaskGroup`으로는 작성할 수 없어요. 그 `foreach`는 매번 멈춘 첫 번째
서비스부터 다시 시작할 테니까요.

그러니 이것이 본질적으로 쌍둥이 사이의 모든 차이입니다. 바로 기억이죠. 그룹은 결과를
저장하고 그것에 관한 어떤 질문에도 반복해서 답하므로, 작업 집합이 고정되어 있고 결과가
전체로서 중요한 경우에 좋아요. 세트는 각 결과를 한 번 넘겨주고 곧바로 메모리를
해제하므로, 끝없는 작업 스트림을 감당할 수 있습니다. 선택을 위한 간단한 규칙이 있어요.
작업에 대한 여러분의 질문이 "무엇을 만들어냈니?"라면 `TaskGroup`을, "다음은 뭐니?"라면
`TaskSet`을 손에 잡으세요.

지난 네 장에 걸쳐 우리는 같은 것을 세 번 만들었어요. 제한 아래에서 각 요소에 대해 병행
작업을 하며 컬렉션을 순회하는 것이죠. 한 번은 채널과 워커로, 한 번은 `TaskGroup`으로,
한 번은 `TaskSet`으로 말이에요. 이제 이 패턴이 자기만의 이름을 갖고 한 줄로 줄어들
때가 되지 않았을까요?
