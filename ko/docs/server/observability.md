---
layout: docs
lang: ko
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /ko/docs/server/observability.html
page_title: "TrueAsync Server: 관측성"
description: "워커 간 요청 통계(getStats), 멀티 sink 구조화 로깅(setLogSinks), OpenTelemetry 액세스 로그, 그리고 런타임 할당자 카운터."
---

# 관측성

(PHP 8.6+, true_async_server 0.10+)

프로덕션의 서버가 노출해야 하는 세 가지: **얼마나 많은 요청을 어떤 상태로 처리했는가**,
**어딘가로 보낼 수 있는 로그**, 그리고 **요청별 액세스 기록**. 이 페이지는 이 셋을 모두
다룹니다. 셋 다 기본값으로 켜져 있지 않습니다 — idle 서버는 아무 비용도 치르지 않습니다.

## 워커 간 통계: `getStats()`

`setStatsEnabled(true)`로 opt-in한 다음, `HttpServer::getStats()`로 집계를 읽습니다:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // start() 전에 설정해야 함

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

spawn(function () use ($server) {
    while ($server->isRunning()) {
        Async\delay(10_000);
        $stats = $server->getStats();
        error_log("requests so far: " . $stats['totals']['total_requests']);
    }
});

$server->start();
```

`getStats()`는 통계가 활성화되지 않았으면 예외를 던집니다 — 꺼져 있으면 카운터 slab이 아예
할당되지 않습니다. 구조:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* 한 워커의 카운터 */ ], 1 => [ … ], … ],
    'reactors' => [ /* 전적으로 transport reactor에서 처리된 요청 */ ],
    'totals'   => [ /* 워커와 reactor에 걸쳐 합산 */ ],
]
```

`totals`가 scraper가 원하는 것입니다:

| 카운터 | 의미 |
|---------|------|
| `total_requests` | 완료된 모든 요청 |
| `responses_2xx_total` … `responses_5xx_total` | 각각 한 번씩 분류되므로, 네 값의 합이 `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | 프로토콜별 라이브 연결 (게이지) |
| `log_records_dropped_total` | 가득 찬 ring이 버린 로그 라인 (아래 참고) |

각 카운터는 그 의미가 허용하는 방식으로 결합됩니다. 단조 증가 total은 **합산되고 `reload()`를
견딥니다** — 물러나는 워커의 total이 상속되므로, scraper는 풀이 rotate했다는 이유만으로 카운터가
거꾸로 도는 것을 결코 보지 않습니다. 활성 게이지는 라이브 워커에 걸쳐서만 합산되므로, 죽은
워커의 마지막 연결 수가 유령처럼 이월되지 않습니다. 읽기는 lock-free이므로, 집계는 rotate 중인
워커 하나만큼만 stale할 수 있습니다.

> **요청 핸들러 안에서 `getStats()`를 호출하려고 `$server`를 클로저로 캡처하지 마세요.**
> 워커 풀에서 이는 `HttpServer ⇄ handler` 참조 순환을 만들고, 핸들러를 워커로 transfer하면
> 프로세스가 크래시합니다
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). 위처럼
> `$server`를 소유한 별도 코루틴에서 통계를 읽으세요 — 핸들러에서가 아니라.

## 구조화 로깅: `setLogSinks()`

하나의 로그 레코드가 여러 **sink**로 동시에 fan-out되며, 각 sink는 자체 목적지, 포맷,
severity 하한을 가집니다:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // 구조화 액세스 로그 -> 파일, OpenTelemetry JSON으로
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // 사람이 읽는 진단 -> 콘솔, 색상 적용
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

이는 단일 스트림 `setLogSeverity()` / `setLogStream()` sugar를 대체합니다. 최대 8개 sink.
잘못된 spec은 `start()` 때가 아니라 `setLogSinks()` 시점에 예외를 던집니다.

**Sink 타입** — `stream`, `file`, `stdout`, `stderr`, `syslog`. 워커 풀에서는 `stream`이 아니라
`file`(또는 `stdout`/`stderr`)을 사용하세요: 부모가 연 PHP 스트림 리소스는 워커 스레드로 넘어갈
수 없습니다 — 그 sink는 부모에 남고 워커에서는 시작 시 알림과 함께 건너뜁니다. `file`은 각
워커가 스스로 경로를 다시 열기 때문에(append 모드) 동작합니다.

**포맷** — `plain`, `logfmt`, `json`(한 줄에 OpenTelemetry-Logs 객체 하나), `pretty`(색상
콘솔 라인. 색상은 `NO_COLOR` / `CLICOLOR_FORCE`를 존중해 대상 fd로부터 결정), 그리고 커스텀
레이아웃을 위한 `template`:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}`(ISO-8601) 또는 `date()` 스타일 부분집합(`Y y m d H i s v`)을 쓰는 `{ts:PATTERN}`, 그리고
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`. 그 외는 리터럴입니다.

**`syslog`**는 RFC 5424를 방출합니다 — TCP에서는 octet-framed(RFC 6587), `udp` / `udg`에서는
datagram당 레코드 하나:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### 액세스 로그: `'category' => 'access'`

sink의 `category`가 레코드 종류를 라우팅합니다: `app`(기본)은 서버 진단을, `access`는 완료된
요청당 정확히 **하나의 구조화 레코드**를, `all`은 둘 다 받습니다 — 그래서 JSON 액세스 로그와
pretty 진단 콘솔이 한 서버에 공존할 수 있습니다.

액세스 레코드는 안정적인 OpenTelemetry HTTP semantic convention을 사용합니다. `json`
포매터의 한 줄을 pretty-print하면:

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
    "SeverityNumber": 9,
    "SeverityText": "INFO",
    "Body": "GET /x 200",
    "Attributes": {
        "http.request.method": "GET",
        "url.path": "/x",
        "http.response.status_code": 200,
        "network.protocol.version": "1.1",
        "http.response.body.size": 11,
        "http.server.request.duration": 9.266e-06,
        "client.address": "127.0.0.1",
        "client.port": 42336
    }
}
```

모든 완료 경로에서 방출됩니다 — 핸들러 반환, 정적 파일, `sendFile()`, compression-reject,
reactor-pool dispatch — HTTP/1, HTTP/2, HTTP/3에 걸쳐, 워커 풀에서도 마찬가지입니다. 요청이
W3C trace context를 실어 왔으면 그것이 추가됩니다. 텍스트 포매터는 값 안의 제어 바이트를
이스케이프하므로, 요청에서 유도된 필드가 로그 라인을 위조할 수 없습니다.

### 어떤 sink도 PHP로 콜백하지 않는다

레코드는 PHP 컨텍스트가 없는 libuv IO 콜백과 HTTP/3 reactor 스레드에서 방출되므로, 로그 경로는
절대 VM에 재진입해서는 안 됩니다 — 설계상 "PHP callable을 호출하는" sink는 없습니다. userland
에서 로그를 export하려면 `'format' => 'json'`으로 sink를 파일이나 소켓에 겨누고 자신의
코루틴에서 drain하세요. 그것이 async-appender 형태이며, exporter latency를 요청 경로에서
떼어놓기도 합니다.

sink의 ring은 유한합니다 — producer는 절대 블로킹해서는 안 됩니다 — 그래서 writer를 앞지르는
burst는 레코드를 대가로 치릅니다. 그것들은 조용히 사라지지 않고 `log_records_dropped_total`
(위 `getStats()` 참고)에 집계됩니다.

## 런타임 할당자 카운터: `getRuntimeStats()`

`HttpServer::getRuntimeStats()`는 서버 자체의 내부 할당자와 워커 간 토픽 트래픽을 보고합니다 —
RSS를 추측 대신 서브시스템에 귀속시킬 수 있게 해주는 카운터들:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — 연결
  slab(라이브 TCP 연결당 `http_connection_t` 하나).
- `body_pool` — 큰 요청 본문의 size-class별 캐시, `body_pool_total_bytes`와 함께.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — 워커 간
  [WebSocket 토픽](/ko/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)
  전달: 다른 워커로 넘겨진 publish, interest 필터가 publisher에게 건너뛰게 한 워커, 그리고
  가득 찬 mailbox에서 버려진 publish(마지막 것은 데이터 손실).

`getStats()`와 달리 이것은 opt-in이 필요 없습니다.

## HTTP/3 카운터: `getHttp3Stats()`

HTTP/3 리스너당 항목 하나. 리스너별 QUIC 카운터(`quic_packets_sent`, `quic_bytes_sent`,
datagram 수, `poll_rearms`, …)를 포함합니다. `--enable-http3` 없는 빌드에서는 빈 배열을
반환합니다. 각 카운터는 개별 relaxed atomic load로 읽히므로, reactor 스레드가 계속 쓰는
중에도 보고는 내부적으로 일관됩니다.

## 참고

- [Multi-worker](/ko/docs/server/workers.html): 풀에서의 로깅과 shutdown
- [설정](/ko/docs/server/configuration.html)
- [`HttpServer::getStats()`](/ko/docs/reference/server/http-server.html)
