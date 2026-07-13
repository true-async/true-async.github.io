---
layout: tutorial
lang: ko
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /ko/tutors-server/01-first-server.html
page_title: "첫 번째 서버"
description: "PHP 내부의 HTTP 서버: HttpServer, HttpServerConfig, 그리고 첫 번째 핸들러."
---

# 첫 번째 서버

PHP가 보통 요청을 어떻게 처리하는지 떠올려 봅시다. Nginx가 연결을
받아 PHP-FPM에 넘깁니다. FPM은 여유 프로세스 하나를 붙잡습니다. 그
프로세스가 깨어나 클래스를 로드하고, 데이터베이스 연결을 열고,
응답을 조립해 전송합니다. 그리고 죽습니다. 그 프로세스가 애써 만든
모든 것, 모든 연결, 모든 캐시, 첫 번째 시리즈에서 아름답게 예열해
둔 그 모든 풀이 쓰레기통으로 갑니다. 1밀리초 뒤에 다음 요청이
도착하면, 이 이야기 전체가 처음부터 다시 반복됩니다. 1초에 백 번.
천 번.

한편 첫 번째 시리즈에서 우리는 이런 삶이 금기인 온갖 도구를
만들어 왔습니다. 연결 풀은 오래 살 때 좋고, 메모이즈된 `Future`는
프로세스와 함께 죽어 버리면 아무 의미가 없습니다.

그래서 이번 시리즈의 계획은 간단합니다. 중간 매개자를 없애는
것입니다. `TrueAsync Server`는 `PHP` 프로세스 안에서 바로 `HTTP`
서버를 실행하는 확장입니다.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener`는 포트를 열고, `addHttpHandler`는 핸들러 함수를
등록하며, `start()`는 이벤트 루프를 시작하고 결코 반환하지
않습니다. 들어오는 모든 요청이 핸들러를 실행합니다.

## 핸들러는 코루틴입니다

모든 핸들러 호출은 자신만의 코루틴(`spawn`)에서 실행됩니다.
실제로 이게 무슨 뜻일까요? 실험을 하나 해 봅시다. 서버에 일부러
느린 라우트를 추가하겠습니다.

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // 5초간의 "무거운" I/O 작업
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

이제 터미널 두 개를 엽니다. 첫 번째에서 `/slow`를 요청합니다.
5초를 기다리며 멈춰 있습니다. 그것을 기다리지 않고, 두 번째
터미널에서 `/`를 요청합니다.

```bash
$ curl http://localhost:8080/
fast
```

즉시 응답합니다.

첫 번째 시리즈를 읽었다면 무슨 일이 일어났는지 이미 이해할
것입니다. `/slow` 코루틴은 `delay`에서 잠들었고, 스케줄러가 제어권을
넘겼으며, 서버는 침착하게 두 번째 요청을 처리했습니다. 이것은 맨 첫
장에 나왔던 바로 그 "A"와 "B" 카운터이며, 다만 지금은 HTTP 요청이라
불릴 뿐입니다. 스레드 하나. 이벤트 루프 하나. 수천 개의 병행
클라이언트.

이제 같은 `/slow`가 고전적인 FPM에 무슨 짓을 할지 상상해
보세요. 5초간의 잠은 워커 하나가 통째로 마비되는 5초입니다. 이런
요청 열 개면 워커 풀이 고갈됩니다. 누군가 낮잠을 다 잘 때까지 사이트
전체가 서서 기다립니다.

## 죽지 않는 프로세스

두 번째 결과는 첫 번째보다 더 흥미롭습니다. 평범해 보이지만
말이죠. `start()`는 결코 반환하지 않습니다. 이는 그 이전에 만들어진
모든 것이 서버가 사는 동안 함께 산다는 뜻입니다.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // 6장의 메모이제이션

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // 풀은 이미 예열되어 있고, 디렉터리는 이미 로드되어 있습니다
});

$server->start();
```

연결 풀은 한 번만 열립니다. 지역 디렉터리는 한 번만 로드됩니다.
라우트는 한 번만 컴파일됩니다. 첫 번째 시리즈에서 재사용 도구에
얼마나 많은 노력을 들였는지 기억하시나요? 바로 여기가 그 모든 것이
마침내 제자리를 찾는 곳입니다. 콜드 스타트가 빨라진 것이 아닙니다.
사라진 것입니다.

공정하게 말하자면, 긴 수명에는 대가가 따르므로 미리 짚어 두는 것이
좋겠습니다. 메모리 누수는 요청 이후 프로세스의 죽음으로 더 이상
용서받지 못합니다. 전역 변수는 더 이상 "한 요청만"이 아니라 영원히,
모두에게 적용됩니다. 겁먹을 필요는 없습니다. 첫 번째 시리즈의 스코프,
풀, 컨텍스트는 바로 이를 위해 고안되었으며, 서버 특유의 세부 사항은
별도의 장에서 다루겠습니다.

지금 우리 서버에는 더 단순한 문제가 있습니다. 모든 것에 같은
대답을 한다는 것입니다. `GET /profile/42`, `POST /profile/42/address`,
URL의 오타, 어느 것이든 상관없습니다. 진짜 `ProfileService`는 요청을
읽는 법을 배워야 합니다. 다음에 다룰 것이 바로 그것입니다.
