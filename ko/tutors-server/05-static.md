---
layout: tutorial
lang: ko
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /ko/tutors-server/05-static.html
page_title: "정적 파일"
description: "StaticHandler: PHP 코루틴 없이 파일 제공, 캐싱, 그리고 보안 정책."
---

# 정적 파일

`ProfileService`에 프론트엔드가 생겼습니다. HTML, CSS, 스크립트,
아바타 등 흔한 것들입니다. 예전에는 nginx가 이것들을 제공했지만,
우리는 첫 장에서 nginx를 엄숙하게 떠나보냈습니다. 이제 누가 그것들을
제공할까요?

첫 충동은 이해할 만합니다. URL로 파일을 여는 핸들러를 작성하는
것이죠. 멈추세요. 그것이 무슨 뜻인지 생각해 보세요. 하루에 로고를
향한 수천 건의 요청, 그리고 그 각각마다 코루틴, PHP 진입, `fopen`,
퇴장. 여기서 PHP는 PHP를 필요로 하는 일을 아무것도 하지 않습니다.

서버는 이것을 근본적으로 해결합니다. 정적 라우트는 전적으로 C에서
처리됩니다. 그것을 향한 요청은 아예 PHP에 진입하지 않습니다.

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

URL 접두사, 디스크의 디렉터리, 끝입니다. `GET /assets/css/app.css`는
libuv를 통해, PHP를 지나쳐, 파일을 소켓으로 바로 읽어 들이는 비동기
읽기로 바뀝니다. 이전 장의 핸들러들은 나머지 모든 것을 계속
받습니다. 마운트는 여러 개일 수 있으며, 매칭은 등록 순서대로
탐색됩니다. `sendFile`의 모든 HTTP 예절이 여기에도 있습니다.
`Content-Type`, 304와 함께하는 `ETag`, `Range`를 통한 다운로드
이어받기.

## 마운트 설정하기

`StaticHandler`는 서버에 붙기 전에 체인으로 설정합니다.

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

한 줄씩 짚어 봅시다.

**`setCacheControl`** — 모든 응답에 붙는 캐싱 헤더입니다. 기본으로 켜져
있는 `ETag`와 짝을 이루면, 브라우저는 파일이 실제로 바뀌었을 때만 파일을
다시 다운로드합니다.

**`enablePrecompressed`** — 제가 가장 좋아하는 항목입니다. `app.css.br`가
`app.css` 옆에 놓여 있으면, 적절한 `Accept-Encoding`을 가진 클라이언트는
준비된 압축 파일을 받습니다. 경제성을 생각해 보세요. 프론트엔드 빌드
단계에서, 가장 비싸고 가장 높은 품질 수준으로 한 번만 압축하고, 압축에
단 한 사이클도 쓰지 않으면서 백만 번 제공합니다.

**`hide`** — 파일의 존재 여부와 상관없이 404를 받는 글롭입니다. 소스 맵과
초안은 나가지 않습니다.

**`setOnMissing(NEXT)`** — 파일을 찾지 못한 요청의 운명입니다. 기본적으로
파일을 못 찾으면 C에서 바로 404로 응답합니다. 대신 `NEXT`는 요청을 평범한
PHP 핸들러로 넘깁니다. 왜일까요? SPA 때문입니다. `/assets/app.js` 파일은
디스크에서 제공되고, 존재하지 않는 `/assets/whatever`는 애플리케이션으로
떨어져 애플리케이션이 자신의 `index.html`로 응답합니다.

`addStaticHandler` 이후 객체는 잠깁니다. 서버가 이미 그것으로부터
핫패스 구조를 만들었기 때문입니다. 그 후 세터를 건드리려는 시도는
예외입니다.

## 기본적으로 안전하게

작은 여담입니다. URL로 파일을 제공하는 것은 역사적으로 웹 서버에서 가장
풍성한 구멍 중 하나입니다. 주소창의 `../../etc/passwd`는 이 장의 많은
독자보다 나이가 많은 수법입니다.

그래서 기본 정책은 편집증적입니다. `..`가 포함된 요청은 404를 받습니다.
선행 점이 있는 파일을 거치는 경로는 404를 받습니다. `.env`도 `.git`도,
설령 실수로 디렉터리에 들어가더라도 새어 나가지 않습니다. 심볼릭 링크는
아예 역참조되지 않습니다. 파일은 물리적으로 마운트 루트 안에 놓여
있어야 하며, 어떤 심링크도 그것을 밖으로 끌어낼 수 없습니다.

이 모든 것은 의도적으로 완화할 수 있지만(`setDotfilePolicy`,
`setSymlinkPolicy`), 기본값은 "꽂아 놓고 잊어버리는" 선택지가 안전하도록
골라져 있습니다.

## 파일이 많을 때

핫 마운트를 위해서는 레버가 하나 더 있습니다.

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

이 캐시는 가장 최근 파일들의 해석된 경로, 메타데이터, 헤더를 기억하고,
반복 요청 시 syscall 순회를 줄입니다. 큰 디렉터리나 네트워크 파일
시스템에서는 눈에 띕니다. 작은 로컬 사이트에서는 그렇지 않으며, 그래서
기본적으로 꺼져 있습니다.

장 전체는 여기까지입니다. 짧을 것이라 약속했었죠. 정적 파일은 PHP를
지나쳐 날아가고, PHP는 자기 일을 계속합니다. 그리고 이제 서비스에
얼굴이 생겼으니, 그것에 생명을 불어넣을 때입니다. 첫 번째 시리즈의 맨
첫 장에서 터미널에 그려졌던 진행 표시줄을 기억하시나요? 그것이 곧
브라우저로 옮겨 갑니다. 그리고 서버 자신이 그것을 그릴 것입니다.
