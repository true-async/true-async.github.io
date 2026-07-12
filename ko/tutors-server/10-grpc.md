---
layout: tutorial
lang: ko
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /ko/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): 유너리와 스트리밍, readMessage/writeMessage, 트레일러, 그리고 데드라인."
---

# gRPC

지금까지는 브라우저만이 우리 서버와 대화했습니다. 하지만
`ProfileService`에는 다른 대화 상대들도 있습니다: `UserDirectory`,
`GeoDirectory`, 결제. 서비스들은 오래전부터 서로 간에 REST가 아니라
gRPC로 대화해 왔습니다. 엄격한 계약, 양방향 스트리밍, 데드라인과
오류 코드가 기본으로 제공되죠.

보통 gRPC를 위해서는 별도의 포트에 별도의 서버를 띄웁니다. 스스로에게
물어보세요. 실제로 왜? gRPC는 HTTP/2와 HTTP/3 위의 프로토콜입니다.
이미 우리를 위해 대기 중인 그것 위에서요. 서버는 그저 그런 요청들을
content-type `application/grpc`로 구별해 별도의 핸들러에 넘겨주기만
하면 됩니다. 그리고 그것이 정확히 서버가 하는 일입니다.

## 계약 우선

gRPC 대화는 코드로 시작하지 않습니다. 계약으로 시작하며, 이것이
아마도 REST와의 주된 문화적 차이일 겁니다. `profile.proto`에서
프로필 서비스를 기술해 봅시다:

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

protobuf 컴파일러가 이것으로부터 PHP 클래스를 생성하고, 런타임은
Composer로 설치합니다:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

이제 프로젝트에 `Profile\GetProfileRequest`와 `Profile\Profile`이
생겼습니다. 타입이 지정된 게터, 세터, 직렬화. 그리고 protoc는 Go,
Java, Python의 클라이언트를 위해서도 정확히 같은 클래스들을 생성해
줍니다. 그것이 바로 핵심입니다. 하나의 계약, 어떤 언어든.

## 본문 대신 메시지

gRPC 핸들러는 HTTP 핸들러와 무엇이 다를까요? 소통의 단위에서
다릅니다. 그쪽에는 "요청 본문"과 "응답 본문"이 각각 하나씩 있었죠.
여기서는 각 방향으로 메시지의 스트림입니다. `readMessage()`는 다음
수신 메시지의 바이트를 반환하거나 끝에서 `null`을 반환하고,
`writeMessage()`는 나가는 메시지를 보냅니다. 서버는 gRPC 프레이밍,
길이, 플래그를 책임집니다. 생성된 클래스들은 내용을 책임지고요:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // 요청 경로가 계약 메서드의 이름을 담고 있다
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // 바이트 -> 객체

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // 객체 -> 바이트
});
```

여기서 라우팅은 그저 경로입니다. 패키지, 서비스, 메서드. 어떤
언어로든 `GetProfile`을 호출하는 클라이언트는
`/profile.ProfileService/GetProfile`로 POST를 보냅니다. 그리고
핸들러 자체는 REST 라우트 옆에 살면서 같은 예열된 풀과 요청 컨텍스트를
봅니다.

gRPC의 네 가지 형태 모두가 이 동일한 API에서 나오며, 호출의 횟수에서만
다릅니다:

```php
// Unary: 한 메시지 보내고, 하나 돌려받는다
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: 하나 보내고, 여러 개 돌려받는다
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex: 읽기와 응답이 교차한다
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()`는 다음 메시지가 올 때까지 코루틴을 재우고,
`writeMessage()`는 들어오는 스트림의 끝을 기다리지 않고 곧바로
응답합니다. WebSocket과 같은 이중 통신(duplex)이지만, 계약과 표준을
갖추었을 뿐이죠.

## 오류 전달하기

gRPC에는 자신만의 오류 코드 체계가 있는데, 그것은 처음엔 헷갈리는
곳에 자리합니다. 응답의 HTTP 상태는 항상 200입니다. 항상. 진짜
결과는 트레일러, 즉 HTTP/2가 본문 뒤에 보내는 헤더에 실려 갑니다.
스트리밍 장에서 언뜻 봤던 것인데, 여기 그것의 주된 소비자가 있습니다:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // 깔끔한 return: 서버가 스스로 grpc-status: 0 (OK)을 덧붙인다
});
```

크래시도 처리됩니다. 핸들러 밖으로 날아나온 예외는 끊긴 연결이 아니라
`grpc-status: 13` (INTERNAL)로 바뀝니다.

## 데드라인

첫 번째 시리즈에서 "모든 대기에는 제한이 있어야 한다"는 발상에 얼마나
많은 장을 들였는지 기억하나요? 자, gRPC에서는 그 발상이 프로토콜
표준으로 격상됩니다. 클라이언트는 자신의 데드라인을 요청에 곧바로,
`grpc-timeout` 헤더를 통해 전달하고, 서버는 그것을 핸들러에게
넘겨줍니다:

```php
$deadline = $req->getGrpcTimeout(); // 밀리초 또는 null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

이 방식이 얼마나 올바른지 생각해 보세요. 클라이언트에게 인내심이
200밀리초 남았다고요? 그렇다면 2초 타임아웃으로 `GeoDirectory`에
갈 이유가 없습니다. 데드라인은 모든 내부 대기를 관통해, 사슬의 모든
서비스를 관통해 실처럼 꿰이고, 시스템 전체가 맨 처음 호출자의 인내심을
존중합니다.

## 두 번째 시리즈의 끝

이것이 전체 여정입니다. 한 번 뒤돌아봅시다.

첫 번째 시리즈의 열다섯 장은 어휘를 쌓고 있었습니다: 코루틴, 취소,
`Future`, 채널, 스코프, 그룹, 풀, 스레드, 컨텍스트. 솔직히 어떤
대목에서는 그 어휘가 과하다고 느껴졌을 수도 있습니다. 그리고 두 번째
시리즈가 왔고, 알고 보니 서버란 바로 그 단어들로 이루어진 하나의
문장일 뿐이었습니다. 모든 요청은 코루틴입니다. 풀이 데이터베이스를
보호합니다. 스코프가 요청 뒤를 치웁니다. 배압이 과부하를 막아냅니다.
스레드가 코어를 점유합니다. 그리고 그 위에 정적 파일, SSE, WebSocket,
gRPC가 하나의 포트 위에.

두 시리즈 어디에도 없었던 것도 눈여겨보세요: 콜백, `.then()` 체인,
두 줄 걸러 한 번씩 나오는 `async`와 `await` 키워드, 수동 이벤트 루프
관리. 모든 코드가 평범한 순차 PHP입니다. 그저 아무것도 아닌 것을
기다리기를 멈췄을 뿐이죠.

여기서부터는 당신 혼자입니다. 오래전부터 손보기를 청해 온 그 서비스를
가져다가, 단 하나의 핸들러로 시작하세요. 클래스 레퍼런스는
[서버 문서](/ko/docs/server/index.html)에 있고, 내부 구조는
[아키텍처](/ko/architecture/server.html)에 있습니다. 그리고 만약
무언가가 이 장들이 약속한 것과 다르게 동작한다면, 당신은 이제 좋은
버그 리포트를 작성할 만큼 충분히 알고 있습니다.
