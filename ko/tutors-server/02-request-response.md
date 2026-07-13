---
layout: tutorial
lang: ko
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /ko/tutors-server/02-request-response.html
page_title: "요청과 응답"
description: "HttpRequest와 HttpResponse: 라우팅, json(), 그리고 HttpException을 통한 오류."
---

# 요청과 응답

핸들러는 객체 두 개를 받습니다. `HttpRequest`는 클라이언트가 보낸
모든 것이며 읽기 전용입니다. `HttpResponse`는 되돌아가는 모든
것입니다. 그 사이에 여러분의 코드가 자리합니다. 이 셋을 바탕으로
최소한의 프로필 `API`를 만들어 보고, 그 과정에서 이 객체들이 무엇을
할 수 있는지 살펴봅시다.

## 요청 파싱하기

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, 쿼리 문자열 없이

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

요청의 상당 부분은 이미 파싱되어 편리한 형태로 제공됩니다.

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', 기본값과 함께

// 폼이 포함된 POST: application/x-www-form-urlencoded 또는 multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// 헤더, 대소문자 구분 없음
$req->getHeader('authorization');    // 'Bearer eyJ...' 또는 null

// 원시 본문, 예를 들어 JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()`와 `getPost()`는 익숙한 PHP 배열 표기법을 이해합니다.
`address[city]`, `photos[]` 같은 것 말입니다. 예전의
`$_GET`/`$_POST`에서 옮겨오는 것은 거의 그대로입니다.

## 응답 조립하기

`API`에는 `JSON`이 필요하고, 응답에는 이를 위한 준비된 헬퍼가
있습니다.

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // 상태 코드는 두 번째 인자로
}
```

나머지 헬퍼들도 같은 취지를 따릅니다.

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

모든 메서드는 `$this`를 반환하므로, 응답은 체인으로 조립됩니다.
명시적으로 마무리할 필요는 없습니다. 핸들러가 반환되면 응답은 나갔던
것입니다.

## 오류: HttpException

이제 `updateAddress`입니다. 프로필이 존재하지 않을 수 있습니다.
주소가 전송되지 않았을 수 있습니다. 검증이 실패할 수 있습니다. 각
경우마다 이른 `return`과 함께 `setStatusCode`를 작성할까요? 그럴 수도
있습니다. 아니면 이렇게 할 수도 있습니다.

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

서버는 번역기 없이 `HttpException`을 이해합니다. 예외 코드는 상태가
되고, 메시지는 응답 본문이 됩니다. 스택 트레이스가 새어 나가는 500은
없습니다. 이 클래스는 final이 아니므로, 여러분만의 계층을 만들고 매직
넘버는 잊어버리세요.

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

여기서 잠깐 여러분의 주의를 부탁드립니다. 이어지는 내용이 이 장에서
제가 가장 좋아하는 세부 사항이기 때문입니다. 이 클래스의 혈통을 보세요.

`HttpException extends Async\AsyncCancellation`

바로 그 취소 예외입니다. 첫 번째 시리즈의 2장에 나왔던 것 말입니다.
우연일까요? 아닙니다. 클라이언트가 요청 도중에 연결을 끊었을 때 서버가
무엇을 해야 할지 생각해 보세요. 핸들러 코루틴을 멈춰야 합니다. 그럼
코루틴은 어떻게 멈추나요? 협력적 취소입니다. HTTP 오류와 코루틴 취소는
알고 보면 같은 메커니즘이며, 다만 서로 다른 쪽에서 본 것일 뿐입니다.

이 친족 관계로부터, 취소를 다룬 장에서 익숙한 오래된 규칙이 나옵니다.
`HttpException`을 `Throwable`과 함께 실수로 잡았다면, 다시 던지세요.
서버는 그것으로 무엇을 해야 할지 압니다. 여러분이 할 필요는 없습니다.

이렇게 `API`는 규칙에 따라 응답하고 규칙에 따라 실패합니다. 그런데
우리 핸들러는 여전히 의심스러울 만큼 단순합니다. 검사 하나, 쿼리 하나,
응답 하나. 이들이 내부에서 데이터베이스, `GeoDirectory`, 캐시를
찔러야 하고, 그것도 되도록 병행으로 해야 한다면 어떻게 될까요? 그것이
3장입니다. 거기서 첫 번째 시리즈가 마침내 모든 실린더로 불을 뿜습니다.
