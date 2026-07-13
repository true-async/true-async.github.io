---
layout: tutorial
lang: ko
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /ko/tutors/12-iterate.html
page_title: "병행 이터레이터"
description: "iterate(): 한 줄로 컬렉션을 병행 순회하기, 제너레이터, 그리고 조기 종료."
---

# 병행 이터레이터

우리가 같은 패턴을 몇 번이나 만들었는지 세어 봐요. 채널 장에서는 채널, 열 개의 워커,
`recv` 루프였죠. TaskGroup 장에서는 `concurrency: 10`, `spawn` 루프, `close()`였고요.
TaskSet 장에서는 같은 것이지만 결과를 소비하는 방식이었어요. 매번 과제는 똑같이
들렸습니다. 컬렉션을 순회하며 각 요소에 병행 작업을 하되, 절대 제한을 넘지 않는 것이죠.

이렇게 흔한 패턴은 자기만의 함수를 가질 자격이 있어요.

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

이것이 워커 풀의 전부입니다. `iterate`는 컬렉션의 각 요소에 대해 함수를 각자의 코루틴에서
호출하고, 열 개를 넘지 않도록 병행 실행을 보장하며, 모든 처리가 끝나면 제어를 돌려줍니다.

## 배열 대신 제너레이터

잠깐, 파일 읽기는 어떻게 되죠? `iterate`를 호출하려고 십만 개의 주소를 배열에 모으는
것은 뒷걸음질일 거예요. 채널 장의 배압이야말로 우리의 메모리를 구해준 것이니까요. 문제
없어요. `iterate`는 배열뿐 아니라 제너레이터를 포함한 모든 `Traversable`을 받습니다.

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

제너레이터는 한 번에 한 줄씩 게으르게 파일을 읽어요. `iterate`는 자리가 하나 비어야만
다음 주소를 끌어오므로, 파일이 한꺼번에 메모리에 담기는 일은 결코 없습니다. 버퍼가 있는
채널이 주는 것과 똑같은 배압이지만, 이제는 그것이 보이지 않아요. 남는 것은 의도를
표현하는 단 한 줄뿐입니다.

## 조기 종료

핸들러 함수는 `false`를 반환해서 순회 전체를 멈출 수 있어요.

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // 파일이 손상되었으니 계속할 이유가 없다
    }
}, concurrency: 10);
```

연속으로 나온 백 개의 잘못된 주소는 우리가 엉뚱한 파일을 받았다는 확실한 신호예요.
`false` 이후로는 새 요소가 시작되지 않고, 이미 실행 중인 코루틴은 하던 일을 마치며,
`iterate`가 반환됩니다.

예외는 더 엄격하고, 여러분은 이미 Scope에서 그 규칙을 알고 있어요. 어느 핸들러의
오류든 순회를 멈추고, 남은 코루틴을 취소하며, 바깥으로 전파됩니다. 기본은 함께
실패하기예요.

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

그 뒤에 마법은 없어요. `iterate` 안에는 여덟 번째 장에서 나온 평범한 자식 스코프가 살고
있으며, 바로 그것이 모든 것을 깔끔하게 유지합니다.

## 추상화의 사다리

여섯 장에 걸쳐 하나의 온전한 사다리가 모양을 갖췄어요. 아래에서 위로, 그것을 한 번 더
돌아볼 가치가 있습니다.

- **채널 + Scope** — 프리미티브입니다. 어떤 토폴로지든 가능해요. 풀, 파이프라인,
  랑데부, 감독자. 최대의 제어, 최대의 코드입니다.
- **`TaskGroup` / `TaskSet`** — 작업 집합을 위한 완성된 조립품으로, 결과가 필요할 때
  씁니다. 전부, 첫 번째, 첫 성공, 또는 준비되는 대로 하나씩요.
- **`iterate()`** — 결과가 필요 없고 그저 컬렉션을 병행으로 순회하면 될 때의 한 줄입니다.

사다리를 오를수록 코드는 줄고 시나리오는 좁아져요. 맨 위에서 시작하세요. `iterate`로
충분하면 그룹을 만들 이유가 없고, 그룹으로 부족하면 채널까지 내려가면 됩니다. 맨
아래에서는 원하는 어떤 구조든 조립할 수 있고, 맨 위에서는 모든 것이 이미 여러분을 위해
조립되어 있어요.

우리의 임포트에 무슨 일이 일어났는지 주목해 보세요. 장을 거듭할수록 계속 줄어들다가,
마침내 한 줄에 들어맞았어요. 바로 그래야 하는 겁니다. 동시성은 사건이기를 멈추고,
`foreach`처럼 평범한 도구가 됩니다.

하지만 아홉 번째 장에서 나온 질문 하나가 아직 남아 있어요. PDO의 경우 연결 풀이 코어에
내장되어 있지만, `checkAddress`는 HTTP로 `GeoDirectory`와 통신합니다. 그 연결도
재사용할 가치가 있고, 그것만이 아니에요. 소켓, 클라이언트, 일반적으로 무거운 객체들도
그렇죠. 정말 매번 채널로 풀을 손수 만들어야 할까요? 다행히도 아니고, 다음 장이 그
이유를 보여줄 거예요.
