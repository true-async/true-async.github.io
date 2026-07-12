---
layout: tutorial
lang: ko
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /ko/tutors-server/04-streaming-uploads.html
page_title: "바이트 스트림"
description: "send()와 sendable(), 본문 스트리밍, 파일 업로드, 그리고 sendFile()."
---

# 바이트 스트림

지금까지 우리의 응답은 작고 통째였으며, `setBody()`와 `json()`으로
만들어졌습니다. API에게는 바로 그것이 원하는 바입니다.

그런데 `ProfileService`가 차원이 다른 작업을 떠맡게 되었습니다. 회계
부서는 한 해치 내보내기를 원하는데, 그것은 수백 메가바이트의 `CSV`입니다.
사용자들은 임포트 파일을 업로드하는데, 그것도 작지 않습니다. 대충
계산해 봅시다. 오십 개의 병행 요청, 각각 백 메가바이트를 메모리에
쥐고 있으면... 아니, 더 세지 맙시다. 그것이 어떻게 끝날지는 이미
분명합니다.

우리는 본문을 부분 단위로 다루는 법을 배워야 합니다. 양방향 모두에서요.

## 부분 단위의 응답: send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

첫 번째 `send()`가 상태와 헤더를 확정하고, 그 후 청크는 준비되는 대로
클라이언트로 나갑니다. HTTP/1.1에서는 chunked로, HTTP/2에서는 DATA
프레임으로 말이죠. 어느 순간에도 메모리에는 한 개의 행만 존재합니다.
클라이언트로 향하는 바이트 스트림이 모습을 갖춥니다!

이제 여러분의 재치를 시험하는 질문입니다. 우리는 데이터베이스에서, 이를테면
초당 1기가비트로 행을 생성합니다. 그런데 클라이언트는 기차에서 모바일
인터넷으로 다운로드하고 있습니다. 남는 행들은 어디로 갈까요?

채널을 다룬 장을 읽었다면 이미 답을 알 것입니다. 배압(backpressure)입니다.
스트림 버퍼가 가득 차면, `send()`는 핸들러 코루틴을 일시 중단합니다.
클라이언트가 큐를 비우면, 코루틴이 깨어나고, 생성이 계속됩니다. 내보내기는
가장 좁은 병목의 속도에 스스로를 맞추며, 주목하세요, 우리는 그것을 위해
단 한 줄도 쓰지 않았습니다!

하지만 느린 클라이언트를 기다리는 것이 늘 원하는 바는 아닙니다.

```php
if (!$res->sendable()) {
    // send()가 지금 당장 블록합니다. 기다리지 않겠다고 합시다.
}
```

`send()`는 언제나 안전합니다. `sendable()`은 다만 경고할 뿐입니다.
다음 호출이 잠들 것이라고요. 다음에 무엇을 할지는 여러분에게 달려
있습니다.

> 느린 클라이언트를 이용한 여전히 인기 있는 공격 유형이 있습니다.
> 연결을 열어 놓고 읽지 않으면서, 서버가 블록될 때까지 버티는 것입니다.
> 코루틴 서버에서는 이것이 덜 무섭습니다. 각 코루틴이 프로세스나
> 스레드보다 훨씬 적은 비용이 들기 때문입니다.
> 그래도 전체 코루틴 한도는 중요한 매개변수이며, 다른 추가 보안 옵션들도
> 마찬가지입니다!
>

## 부분 단위의 요청 본문: readBody()

반대 상황입니다. 사용자가 1기가바이트 CSV를 업로드하는데, 기본적으로
핸들러는 본문 전체가 읽힌 뒤에 호출됩니다. "기가바이트"라는 단어와
"메모리로"라는 단어가 한 문장에 있는 것, 바로 그것이 우리가 피하기로
합의한 것입니다.

스트리밍 모드를 켭니다.

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

`TrueAsync` 서버에서는 핸들러가 헤더 직후에, 충분히 이르게 시작됩니다.
사실 코루틴의 작업은 소켓에서 데이터를 받는 것과 정확히 발맞추어
일어납니다. 그래서 여기서 데이터 스트림을 다루는 것이 자연스럽게 들어맞습니다.

오십 개의 병행 20 MiB 업로드를 실행하면, 최대 메모리는 1170 MiB였을
것이 197이 되었습니다. 처리량은 거의 세 배로 늘었는데, 업로드가
끝나기를 기다리지 않고 처리가 시작되기 때문입니다. 설정 한 줄치고는
나쁘지 않습니다.

## 파일이 포함된 폼: UploadedFile

파일이 포함된 고전적인 HTML 폼은 더 쉬운 경우이며, 이를 위해서는
아무것도 켤 필요가 없습니다. Multipart는 항상 스트림으로 파싱되며,
핸들러는 준비된 객체를 받습니다.

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

PSR-7을 본 적 있는 사람은 편안함을 느낄 것입니다. `moveTo()`,
`getSize()`, `getClientFilename()`. 한 필드에 여러 파일(`photos[]`)은
`getFiles()`를 통해 배열로 옵니다.

## 파일 제공하기: sendFile()

이제 준비된 파일을 제공하는 일이 남았습니다. 이것만큼은 `fopen`과
`send()`로 손수 조립해서는 안 됩니다. 그 이유는 이렇습니다.

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

그 한 번의 호출 뒤에는 약 삼십 년의 HTTP 역사가 숨어 있습니다.
확장자로부터의 `Content-Type`. 반복 요청이 짧은 304로 넘어가도록 하는
`ETag`와 `Last-Modified`. 클라이언트가 중간에 끊겼을 때 `Range`를 통한
다운로드 이어받기. 클라이언트가 gzip을 이해하면 미리 압축된 이웃
파일(`report.csv.gz`) 제공. 그리고 그 모든 것을 이벤트 루프를 붙잡지
않으면서 디스크로부터 비동기 읽기로 처리합니다. 이것을 손수 작성한다는
것은 그 절반 이상을 잊는다는 뜻입니다.

한 가지 규칙. `sendFile()` 이후 응답은 봉인됩니다. 거기에 무언가를 더
쓰는 것은 통하지 않으며, 예외가 발생합니다.

이제 우리는 1기가바이트 파일을 받을 수도, 제공할 수도 있습니다.
그런데 이 모든 것을 PHP 핸들러를 통해 누구에게 제공하는지 주목하세요.
접근 권한으로 통제되는 리포트, 일회성 링크 뒤의 파일들입니다. 그럼
CSS는요? 로고는요? 그것들은 모두에게 똑같으며, 각각을 위해 코루틴을
띄우는 것은 조금 어색하게 느껴집니다. 그것이 다음 장이며, 짧을 것입니다.
