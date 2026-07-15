---
layout: tutorial
lang: ko
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /ko/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket: recv 루프, 채팅방, 다른 코루틴에서의 send, 그리고 느린 클라이언트에 대응하는 trySend."
---

# WebSocket

고객 지원 채팅에서는 양쪽이 모두 글을 씁니다. 사용자가 질문하고
운영자가 답하며, 어느 쪽도 상대를 기다리지 않습니다. 메시지는 쓰여질
때마다 양방향으로 오갑니다.

이미 알고 있는 도구들만으로 이런 채팅을 조립할 수 있을까요?
아래 방향, 즉 서버에서 브라우저로는 SSE가 실어 나릅니다. 어제 장부터
할 수 있었던 일이죠. 그러면 위쪽은요? 위쪽으로는 사용자가 쓴 한 줄
한 줄마다 별도의 POST를 보내야 할 겁니다. 새 요청, 헤더, 응답,
연결 해제. "고마워요, 도움이 됐어요" 한 마디마다 이 과정을 반복하는
거죠. 작동은 하겠지만, 그리 좋지는 않습니다.

양방향 대화를 위해서는 별도의 프로토콜, WebSocket이 있습니다.

이 프로토콜은 놀라울 만큼 소박하게 만들어져 있습니다. 클라이언트가
`Upgrade` 헤더를 담은 평범한 HTTP 요청을 보냅니다. 다른 프로토콜로
전환하자는 제안이죠. 서버가 동의합니다: `101 Switching Protocols`.
그걸로 끝, HTTP는 종료됩니다. 같은 TCP 연결 위에서 이제 메시지가
요청도 응답도 없이 양방향으로 오갑니다.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

핸드셰이크는 서버가 전적으로 도맡습니다. 핸들러는 연결이 이미 전환된
뒤에 호출되며, 준비된 객체를 받습니다. 모델은 익숙합니다. 하나의 연결,
하나의 코루틴. `WebSocket`은 `Iterator`를 구현하며, 코루틴을 다음
메시지가 올 때까지 재우는 것이 바로 이 이터레이터입니다. 클라이언트가
떠나면 루프가 끝나고, 서버가 스스로 `1000 Normal` 코드로 연결을
닫습니다. 그리고 평범한 HTTP 핸들러들은 같은 포트 위에서 나란히 계속
동작합니다.

## 채팅방

에코는 준비운동입니다. 실제 채팅에서는 한 참가자의 메시지가 나머지
모두에게 도달해야 합니다. 이것이 기술적으로 무엇을 의미하는지 잠시
생각해 봅시다. 한 연결을 담당하는 코루틴이 다른 연결들에 써야 한다는
뜻이죠. 문제의 원천처럼 들리나요? 보세요:

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Welcome, people in the room: {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

서른 줄, 그 안에서 첫 번째 시리즈의 세 가지 줄기가 한꺼번에 만납니다.
서둘러 넘어가지 마세요. 하나하나가 멈춰 볼 가치가 있습니다.

첫 번째: 채팅방은 그저 하나의 객체입니다. 모든 코루틴이 공유하는
평범한 `SplObjectStorage`, 락은 단 하나도 없습니다. 채널을 다룬 장에서
하나의 스레드 안에서는 이것이 허용된다고 약속했는데, 여기 그 실제
사례가 있습니다.

두 번째: `finally`입니다. 참가자는 우아하게 떠날 수도 있고, Wi-Fi와
함께 사라질 수도 있으며, 종료 시 서버 자신에 의해 코루틴이 취소될
수도 있습니다. 세 가지 시나리오, 하나의 `finally`. 그리고 유령이
채팅방에 남아 배회하는 일은 확실히 없습니다. 협력적 취소의 진면목이죠.

세 번째: 남의 연결에 쓰는 것은 어느 코루틴에서든 허용됩니다.
`send()`와 `trySend()`는 이 용도로 안전합니다. 서로 다른 발신자의
프레임이 와이어 상에서 뒤섞이지 않도록 서버 자신이 보장하기
때문입니다. 하지만 읽기는 오직 한 곳에서만 가능합니다. 같은 연결에
대한 두 번째 병행 `recv()`는 예외를 받게 되며, 그럴 만합니다.
바이트 스트림에는 두 명의 독자를 위한 의미 있는 시맨틱이 없으니까요.

## 느린 클라이언트가 채팅방을 멈추지 못하게

브로드캐스트가 `send`가 아니라 `trySend`를 쓴다는 것을 눈치챘나요?
오타가 아니라 결정입니다. 짚고 넘어갈 가치가 있어요.

가득 찬 버퍼에서 `send()`는 무엇을 할까요? 맞아요, 배압입니다.
클라이언트가 밀린 것을 처리할 때까지 코루틴을 재웁니다. 개인적인
답장에는 바로 이것이 원하는 바입니다. 이제 브로드캐스트 루프에서
그것을 상상해 보세요. 한 참가자가 모바일 인터넷을 켠 채 터널로
들어가서 버퍼가 가득 찼고, 그러면... 채팅방 전체가 기다립니다.
한 명이 수신이 나쁘다는 이유로 백 명이 메시지를 못 받는 거죠.

`trySend()`는 절대 기다리지 않습니다. 메시지가 버퍼에 받아들여지면
`true`, 버퍼가 가득 차 있으면 `false`이고 메시지는 버려집니다.
채팅은 모두를 벌하지 않기 위해 뒤처진 사람의 메시지를 의도적으로
희생합니다. 잔인한가요? 채팅에서는 아닙니다. 채팅방에서 한 줄
놓친 것은 비극이 아니니까요. 당신의 과제에서 손실이 허용되지
않는다면 `send()`를 쓰고 멈춤을 감수하거나, 클라이언트마다 큐를
구축하세요. 두 전략 모두 정직하며, 선택은 당신의 몫입니다.

최후의 수단으로 안전장치도 있습니다. `send()`가 쓰기 타임아웃보다
오래 대기 중이면 `WebSocketBackpressureException`을 던집니다.
이것은 연결을 열어둔 채 전혀 읽지 않는 클라이언트에 대한 이야기입니다.

## 장부 없는 채팅방

`SplObjectStorage`는 잘 작동했지만, 그것이 우리에게 무엇을 치르게
했는지 세어 보세요. 공유 객체 하나, 브로드캐스트 루프 하나, 그리고
유령을 쓸어내는 `finally` 하나. 한 사람이 친 한 줄이 다른 이들에게
닿게 하려고 이 모든 것을 말이죠. 이것은 너무나 흔한 바람이라, 서버가
직접 들어줍니다. 연결이 어떤 이름에 **구독(subscribe)** 하면, 그 이름으로
**발행(publish)** 된 메시지가 구독한 모두에게 닿습니다. 같은 채팅, 장부는
없이:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

저장소가 사라졌고, 그와 함께 루프도 `finally`도 사라졌습니다.
`subscribe()`는 이 연결을 채팅방에 넣고, `publish()`는 그 안의 모두에게
한 줄을 보내며, 닫히는 연결은 자신의 채팅방들을 스스로 떠납니다.
`publish()`는 방금 `trySend()`가 맺은 것과 같은 약속을 지킵니다.
버퍼가 밀린 상대는 채팅방을 지체시키는 대신 그 줄을 버리며, 발신자를
결코 막지 않습니다.

이름은 그저 라벨이 아니라 MQTT 스타일 필터입니다. 레벨은 `/`로
구분되고, `+`는 한 레벨과, `#`는 나머지 전부와 일치합니다.
`chat/+/typing`을 구독하면 모든 채팅방의 타이핑 신호를 한꺼번에 듣게
되고, `subscriberCount("chat/general")`은 몇 명이 듣고 있는지 알려줍니다.
그리고 조용히 중요한 것이 하나 더 있으니, 다음 장에서 현금으로 바꿔
쓸 것입니다. 토픽은 하나의 연결에도, 심지어 메모리 속 하나의 배열에도
묶여 있지 않습니다. 이 점을 꼭 붙들어 두세요.

## 누가 이들을 채팅방에 들여보냈나?

지금은 누구나 채팅방에 들어올 수 있습니다. 문 앞에서 검사하고
싶다면 핸들러에 세 번째 매개변수를 선언하세요. 그러면 서버가
핸드셰이크 객체를 넘겨줍니다:

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... 채팅방 ...
    }
);
```

`reject()`는 프로토콜을 전환하는 대신 평범한 HTTP 오류로 응답합니다.
같은 객체를 통해, 클라이언트가 제안한다면 서브프로토콜 협상도
이루어집니다.

채팅이 준비됐습니다. 메모리 속의 채팅방, 즉각적인 브로드캐스트,
아무도 뒤처진 이 때문에 느려지지 않습니다. 이 모든 것이 딛고 선
공식을 기억하세요. "프로세스 메모리 안의 공유 상태." 잘 기억해
두세요. 다음 장에서는 기계의 모든 코어를 점유하기 위해 여러 워커를
켤 텐데, 그 순진해 보이는 공식이 가장 먼저 폭발할 것입니다.
