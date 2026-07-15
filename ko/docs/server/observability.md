---
layout: docs
lang: ko
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /ko/docs/server/observability.html
page_title: "TrueAsync Server: 관측성"
description: "getStats()로 요청 통계, Prometheus /metrics 엔드포인트와 Grafana, setLogSinks()로 구조화 로깅과 액세스 로그, 그리고 런타임 카운터."
---

# 관측성

(PHP 8.6+, true_async_server 0.10+)

서버는 요청 통계를 보고하고, 구조화된 로그를 기록하며, 요청마다 액세스 로그 레코드를 하나씩
남길 수 있습니다. 여기 나오는 모든 기능은 기본적으로 꺼져 있습니다.

## 요청 통계: `getStats()`

`setStatsEnabled(true)`로 통계를 켠 다음, `getStats()`로 읽습니다:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

$server->start();
```

`getStats()`는 워커별 카운터와 합산된 total을 반환합니다. 통계가 켜져 있지 않으면 예외를
던집니다.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* one worker's counters */ ], 1 => [ … ] ],
    'totals'  => [ /* summed across workers */ ],
]
```

`totals`에는 다음이 들어 있습니다:

| 카운터 | 의미 |
|---------|------|
| `total_requests` | 완료된 요청 수 |
| `responses_2xx_total` … `responses_5xx_total` | 상태 클래스별 응답 수. 네 값의 합이 `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | 프로토콜별 열린 연결 수 |

total은 `reload()`를 거쳐도 계속 증가합니다. 연결 카운터는 살아 있는 워커만 집계합니다.

## Prometheus와 Grafana

서버는 `/metrics` 엔드포인트를 직접 노출하지 않습니다 — `getStats()`는 평범한 PHP 배열을
돌려주고, 그것을 모니터링 스택이 원하는 형식으로 바꾸는 것은 여러분의 몫입니다. Prometheus
라면 배열을 [텍스트 노출 형식](https://prometheus.io/docs/instrumenting/exposition_formats/)으로
포매팅하는 작은 핸들러 하나면 됩니다:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) use ($server) {
    if ($req->getPath() === '/metrics') {
        $t = $server->getStats()['totals'];

        $body  = "# HELP http_requests_total Requests completed.\n";
        $body .= "# TYPE http_requests_total counter\n";
        $body .= "http_requests_total {$t['total_requests']}\n";

        $body .= "# HELP http_responses_total Responses by status class.\n";
        $body .= "# TYPE http_responses_total counter\n";
        foreach (['2xx', '3xx', '4xx', '5xx'] as $class) {
            $body .= "http_responses_total{class=\"{$class}\"} {$t["responses_{$class}_total"]}\n";
        }

        $body .= "# HELP http_connections_active Open connections by protocol.\n";
        $body .= "# TYPE http_connections_active gauge\n";
        foreach (['h1', 'h2', 'h3'] as $proto) {
            $body .= "http_connections_active{protocol=\"{$proto}\"} {$t["conns_active_{$proto}"]}\n";
        }

        $res->setHeader('Content-Type', 'text/plain; version=0.0.4')->end($body);
        return;
    }

    $res->json(['ok' => true]);
});

$server->start();
```

Prometheus가 이 엔드포인트를 바라보게 합니다:

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

카운터는 모든 워커가 갱신하고 `getStats()`가 읽는, 프로세스 전체가 공유하는 하나의 테이블에
들어 있습니다. 그래서 한 번의 scrape로 풀 전체가 커버됩니다:

![워커에서 Grafana로 흐르는 메트릭](/diagrams/en/server-observability/metrics-flow.svg)

그다음부터 Grafana는 다른 Prometheus 소스와 똑같이 요청 속도, 상태 클래스, 열린 연결을
그래프로 그립니다:

![서버 메트릭을 보여주는 Grafana 대시보드](/diagrams/en/server-observability/grafana-dashboard.png)

## 로깅: `setLogSinks()`

`setLogSinks()`는 각 로그 레코드를 하나 이상의 목적지로 보냅니다. 목적지마다 자체 포맷과 최소
레벨을 가집니다:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

목적지는 최대 8개. 이는 단일 스트림 방식의 `setLogSeverity()` / `setLogStream()`을 대체합니다.

**레코드가 가는 곳** — `type`은 `file`, `stdout`, `stderr`, `syslog`, `stream` 중 하나입니다.
워커 풀에서는 `file`(또는 `stdout` / `stderr`)을 사용하세요: 부모가 연 `stream` 리소스는 워커
스레드와 공유할 수 없어서, 부모에서만 사용됩니다.

**보이는 모양** — `format`은 `plain`, `logfmt`, `json`, `pretty`(색상이 들어간 콘솔 줄),
`template` 중 하나입니다:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

플레이스홀더: `{ts}` 또는 `{ts:PATTERN}`(`date()` 스타일의 `Y y m d H i s v`), `{level}`,
`{msg}`, `{attrs}`, `{trace}`, `{span}`. 그 밖의 것은 쓴 그대로 출력됩니다.

`syslog` 목적지는 TCP, UDP, 또는 unix 소켓 위에서 RFC 5424로 통신합니다:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### 액세스 로그

목적지가 무엇을 받을지는 `category`로 정합니다: `app`(기본값)은 서버 진단을, `access`는 완료된
요청마다 레코드 하나를, `all`은 둘 다 받습니다. 그래서 JSON 액세스 로그와 읽기 좋은 진단
콘솔을 나란히 돌릴 수 있습니다.

액세스 레코드는 OpenTelemetry HTTP 규약을 따릅니다. `json` 레코드 하나의 예:

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
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

레코드는 HTTP/1, HTTP/2, HTTP/3의 모든 요청마다 기록되며, 워커 풀에서도 마찬가지입니다. 요청이
W3C trace context를 실어 왔으면 그것도 포함됩니다.

## 런타임 카운터: `getRuntimeStats()`

`getRuntimeStats()`는 서버 자체의 메모리 풀과 워커 간 WebSocket 토픽 트래픽을 보고합니다 —
메모리 증가가 어느 서브시스템 탓인지 가려낼 때 유용합니다. 별도로 켤 필요는 없습니다. 키에는
연결 arena(`conn_arena_*`), 요청 본문 풀(`body_pool*`), 토픽 전달(`ws_topic_posted` /
`ws_topic_skipped` / `ws_topic_dropped`)이 포함됩니다.

## HTTP/3 카운터: `getHttp3Stats()`

`getHttp3Stats()`는 HTTP/3 리스너마다 항목 하나씩을, 그 QUIC 카운터(`quic_packets_sent`,
`quic_bytes_sent`, datagram 수 등)와 함께 반환합니다. `--enable-http3` 없이 빌드하면 빈 배열을
반환합니다.

## 참고

- [Multi-worker](/ko/docs/server/workers.html): 풀에서의 로깅과 shutdown
- [설정](/ko/docs/server/configuration.html)
- [`HttpServer::getStats()`](/ko/docs/reference/server/http-server.html)
