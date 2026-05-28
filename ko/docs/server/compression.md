---
layout: docs
lang: ko
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /ko/docs/server/compression.html
page_title: "TrueAsync Server: HTTP 압축"
description: "TrueAsync Server의 gzip, Brotli, zstd: Accept-Encoding 협상, MIME 필터, 한도, BREACH 방어, 수신 본문 디코딩."
---

# HTTP 압축

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server는 세 가지 코덱 **gzip**, **Brotli (br)**, **zstd**를 지원하며, HTTP/1.1, HTTP/2,
HTTP/3 모든 프로토콜에서 동일하게 동작합니다.

## 백엔드

- **gzip** — `zlib-ng`(권장, 동일한 압축 레벨에서 약 2–4배 빠름) 또는 시스템 `zlib` 폴백.
  코드는 동일하며 `zng_*` ↔ `*` 매크로 계층으로 전환합니다.
- **Brotli** — `libbrotli`. `--enable-brotli`가 라이브러리를 찾은 경우에만 활성화됩니다.
- **zstd** — `libzstd`. `--enable-zstd`가 라이브러리를 찾은 경우에만 활성화됩니다.

빌드에 포함된 항목은 런타임에 확인할 수 있습니다.

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

목록에는 항상 `"identity"`가 포함됩니다. `--enable-http-compression`이 성공하면 `"gzip"`이
추가되고, configure 시점에 해당 라이브러리가 있으면 `"br"`/`"zstd"`가 추가됩니다.

## 서버 측 선호도

서버의 선호 순서: **`zstd > gzip > brotli > identity`**.

> **왜 brotli보다 gzip이 앞인가?** Brotli 인코더는 상태 재사용이 불가능합니다
> (`libbrotli`에 공개 reset API가 없음). arena 할당자가 도입되기 전까지(TODO Step 4),
> gzip의 `deflateReset`이 더 나은 기본값을 제공합니다. q-value로 brotli를 명시적으로 선호하는
> 클라이언트(`br;q=1.0, gzip;q=0.5`)는 여전히 brotli를 받습니다.

## 협상 (RFC 9110 §12.5.3)

서버는 클라이언트의 `Accept-Encoding`을 파싱합니다: q-value, `identity;q=0`, `*;q=0`. 헤더가
**없으면** 응답은 압축 없이 전송됩니다 (identity-only). nginx와 동일하며 RFC의 엄격한 해석보다
더 안전합니다.

압축을 **건너뛰는** 조건:

- 상태 `1xx`, `204`, `304`
- 메서드 `HEAD`
- `Range`가 있는 응답
- 핸들러가 직접 `Content-Encoding`을 지정
- MIME이 화이트리스트에 없음
- 본문이 임계값보다 작음

## 구성

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // 마스터 스위치 (기본: true)
    ->setCompressionLevel(6)                   // gzip 1..9, 기본 6
    ->setBrotliLevel(4)                        // 0..11, 기본 4
    ->setZstdLevel(3)                          // 1..22, 기본 3
    ->setCompressionMinSize(1024)              // 1 KiB 미만 본문은 압축 안 함
    ->setCompressionMimeTypes([
        'application/javascript',
        'application/json',
        'application/xml',
        'image/svg+xml',
        'text/css',
        'text/html',
        'text/javascript',
        'text/plain',
        'text/xml',
    ])
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // anti-zip-bomb 한도
```

### 압축 레벨

| 코덱 | 범위 | 기본 | 비고 |
|-------|---------:|-------:|-----------|
| gzip | 1..9 | 6 | 고전적 zlib 시맨틱 |
| brotli | 0..11 | 4 | quality 11은 quality 4보다 약 50배 느리며 큰 이득은 없음 |
| zstd | 1..22 | 3 | zstd 팀의 기본값: 더 나은 비율과 gzip-6보다 빠름 |

### MIME 화이트리스트

`setCompressionMimeTypes()`는 목록을 **완전히 교체**합니다 (nginx의 `gzip_types` 시맨틱).
항목은 setter 시점에 정규화됩니다: 매개변수(`; charset=...`)는 제거되고, 공백은 trim되며,
모두 소문자로 변환됩니다. 런타임 비교는 정확하고 zero-allocation입니다.

### Anti-zip-bomb

`setRequestMaxDecompressedSize($bytes)`는 수신 본문의 **디코딩 후** 크기에 대한 한도를 정합니다.
기본 10 MiB. 초과 시 413이 반환됩니다. `0`은 한도를 해제하지만 명시적으로 지정해야 합니다 —
암묵적 무한은 없습니다.

## 응답별 opt-out

`HttpResponse::setNoCompression()`은 모든 것을 무시합니다 (Accept-Encoding, MIME, 크기). 다음에
적용하세요.

- 비밀과 반사된 사용자 입력이 섞인 엔드포인트 (**BREACH mitigation**)
- 이미 `Content-Encoding`이 설정된 payload (핸들러가 직접 처리한 경우)
- 서버가 감싸지 말아야 할 모든 응답

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // CSRF 토큰 + 반사된 검색어 포함, BREACH에 민감
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

이 메서드는 멱등합니다.

## 스트리밍

핸들러가 `HttpResponse::send($chunk)`를 호출하면, 첫 호출 시 압축 wrapper가 투명하게 활성화되며
(협상이 허용한 경우) **각 source chunk에 대해 하나의 downstream chunk**를 출력합니다. 이로써
chunked H1과 H2 DATA 프레임에서 framing 효율을 유지합니다.

## 수신 디코딩

요청의 `Content-Encoding: gzip` / `br` / `zstd`(및 레거시 `x-gzip`)은 투명하게 디코딩됩니다.
`identity`는 no-op입니다. 알 수 없는 coding → 413/415 (아래 참고).

| 상황 | 코드 |
|----------|----:|
| 알 수 없는 coding | 415 |
| anti-bomb 한도 초과 | 413 |
| 손상된 inflate | 400 |

핸들러에서는 이미 디코딩된 본문을
[`HttpRequest::getBody()`](/ko/docs/reference/server/http-request.html#getbody)로 볼 수 있습니다.

## One-shot brotli

0.6.3부터 서버는 크기를 알 수 있는 본문에 대해 `BrotliEncoderCompress()`를 사용합니다
(size-hint `BROTLI_PARAM_SIZE_HINT`). 인코더는 임의 길이를 가정하는 스트리밍 모드 대신
처음부터 적절한 ring buffer와 해시 테이블 크기를 선택합니다. chunked / 길이 미상 응답에는
스트리밍 경로가 그대로 유지됩니다.

## 벤치마크

C 측 기본값은 프로덕션 기준(gzip 6, brotli 4)으로 설정되어 있습니다. 저자의 벤치 호출은 Swoole의
`BrotliEncoderCompress` 경로와 동등하게 하기 위해 `setCompressionLevel(1)` / `setBrotliLevel(1)`을
사용합니다.

## 참고

- [`HttpServerConfig::setCompressionEnabled()`](/ko/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/ko/docs/reference/server/http-response.html#setnocompression)
- [정적 파일](/ko/docs/server/static-files.html): precompressed sidecar (`.br`, `.gz`, `.zst`)
