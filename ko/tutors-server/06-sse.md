---
layout: tutorial
lang: ko
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /ko/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE: 브라우저로 향하는 이벤트 스트림, 임포트 진행률, 그리고 sseComment()를 통한 하트비트."
---

# Server-Sent Events

이제 주소 임포트는 페이지의 버튼에서 시작합니다. 사용자가 클릭하면
파일이 전송되고 처리가 시작됩니다. 이 작업은 대략 10분간 실행됩니다.
그동안 사용자는 무엇을 볼까요?

맞아요, 빙글빙글 도는 스피너입니다. 10분 동안이나요. 살아 있다는
신호는 단 하나도 없이 말이죠. 3분쯤 지나면 사용자는 다 멈춰버렸다고
판단하고 페이지를 새로고침한 뒤 임포트를 두 번째로 시작할 겁니다.
진행률 표시줄이 필요합니다.

고전적인 해법은 폴링입니다. 브라우저가 1초에 한 번씩 `/import/progress`
를 호출하면 서버가 숫자로 응답합니다. 작동하나요? 작동합니다. 하지만
계산해 보세요. 10분 동안 600번의 요청, 헤더까지 포함해서, 전체 처리
사이클과 함께, 게다가 각 요청의 페이로드는 달랑 숫자 하나입니다.
우리가 정말 원하는 건 그 반대입니다. 브라우저가 한 번 연결하면,
그때부터는 서버가 값이 바뀔 때마다 직접 숫자를 보내주는 것이죠.

`SSE`, 즉 `Server-Sent Events`가 바로 그렇게 합니다. 새로운 프로토콜은
없습니다. 서버가 닫지 않고 계속 이벤트를 이어 붙이는 평범한 `HTTP`
응답입니다. 브라우저 쪽에서는 내장 `EventSource`가 이를 받아들이며,
라이브러리는 단 하나도 필요 없습니다.

## 브라우저로 향하는 진행률

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... 라우팅 ... */ }

    $import = currentImport(); // 첫 번째 시리즈의 바로 그 ImportService

    $res->sseStart();
    $res->sseRetry(3000); // 스트림이 끊기면 브라우저는 3초 후 재연결한다

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // 탭이 닫혔으니, 그려줄 대상이 없다
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

그리고 브라우저에서는:

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

핸들러의 구조를 자세히 보세요. 루프. 값 읽기. `delay(1000)`. 뭔가
떠오르나요? 이것은 바로 첫 장에 나온 진행률 코루틴입니다. 글자 하나까지
그대로예요. 바뀐 것은 마지막 줄뿐입니다. 터미널로 `echo`하는 대신
열린 응답에 `sseEvent()`를 하는 것이죠. 열다섯 장이 지나 진행률
표시줄이 브라우저에 도달했지만, 코드는 거의 바뀌지 않았습니다.
그리고 그때처럼, 진행률은 임포트에 대해 아무것도 모르고, 임포트는
진행률에 대해 아무것도 모릅니다.

내부에도 마법 같은 건 없습니다. SSE 메서드들은 4장의 `send()` 위에
얹힌 얇은 포맷팅 계층일 뿐입니다. 여기서 두 가지 공짜 선물이
나옵니다. 배압(backpressure): 느린 탭이 서버의 메모리를 잡아먹지
않습니다. 그리고 프로토콜 독립성: 같은 핸들러가 `HTTP/1.1`, `HTTP/2`,
`HTTP/3` 위에서 모두 동작하며, 선택은 브라우저가 합니다.

## 긴 침묵과 하트비트

`SSE` 연결은 몇 분, 몇 시간을 살아갑니다. 긴 수명에는 늘 그렇듯 나름의
지병이 따릅니다. 여기에는 두 가지가 있어요.

첫 번째: 쓰기 타임아웃입니다. 기본적으로 서버는 응답을 보내는 데 걸리는
시간에 제한을 두며, 이는 옳은 일입니다. 하지만 SSE 응답은 영원히
"전송 중"입니다. 그것이 본성이니까요. 스트림을 다루는 서비스에서는
이 제한을 꺼둡니다:

```php
$config->setWriteTimeout(0);
```

두 번째 지병은 좀 더 미묘합니다. 임포트가 오랫동안 멈춰 있다고
가정해 봅시다. 무언가 무거운 계산을 하느라 이벤트가 나가지 않는
겁니다. 우리에게는 그저 잠깐의 멈춤이지만, 서버와 브라우저 사이의
어떤 프록시에게는 죽어서 정리해야 할 연결로 보입니다. 그리고 실제로
정리해 버립니다. nginx는 이런 경우 기본값이 60초입니다.

그 치료법은 우스울 만큼 단순합니다:

```php
$res->sseComment(); // 와이어 상에는: ":\n\n"
```

주석입니다. 브라우저는 조용히 무시하지만, 와이어를 타고 흘러가 모든
중간 매개자에게 연결이 살아 있음을 납득시키는 이벤트죠. 멈춤 구간
동안 타이머로 이것을 보내면, 스트림은 어떤 침묵도 견뎌냅니다.

## 끊김과 복구

모바일 네트워크가 깜빡였고, 스트림이 끊겼습니다. 어떻게 해야 할까요?
아무것도 안 해도 됩니다. 정말입니다. `EventSource`는 `sseRetry()`에서
지정한 간격만큼 기다린 뒤 스스로 연결을 복구합니다.

여기서 도와줄 만한 유일한 한 가지는, 백지 상태에서 다시 시작하지
않도록 하는 것입니다. 이벤트에 번호를 매기세요:

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

재연결 시 브라우저는 마지막으로 받은 번호를 담은 `Last-Event-ID`
헤더를 보내고, 핸들러는 정확히 그 지점부터 이어서 진행합니다:

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

전달, 재연결, 놓친 것을 따라잡기. 정직한 알림 채널이며, 이 모든 것이
가장 평범한 HTTP 위에서 이루어집니다.

한 가지 유의점이 있습니다. 이 채널은 단방향입니다. 서버가 말하고,
브라우저가 듣습니다. 진행률 표시줄에는 이것이 이상적입니다. 하지만
양쪽이 모두 글을 쓰는 고객 지원 채팅이라면요? 채팅을 위해서는 좀 더
본격적인 무언가가 필요합니다.
