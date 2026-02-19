---
layout: page
lang: ko
path_key: "/motivation.html"
nav_active: motivation
permalink: /ko/motivation.html
page_title: "동기"
description: "PHP에 내장 비동기 기능이 필요한 이유"
---

## PHP에 비동기가 필요한 이유는?

`PHP`는 **언어 수준**에서 동시 실행에 대한 내장 지원이
아직 부족한 마지막 주요 언어 중 하나입니다. Python에는 `asyncio`가 있고, `JavaScript`는 기본적으로
이벤트 루프 위에 구축되어 있으며, `Go`에는 고루틴이, `Kotlin`에는 코루틴이 있습니다. `PHP`는
대부분의 실제 애플리케이션이 `I/O` 대기에 대부분의 시간을 소비하는데도(`IO Bound`)
"하나의 요청 — 하나의 프로세스" 패러다임에 머물러 있습니다.

## 분절 문제

오늘날 `PHP`에서 비동기는 확장을 통해 구현됩니다: `Swoole`, `AMPHP`, `ReactPHP`.
각각은 호환되지 않는 `API`를 가진 **자체 생태계**를 만들며,
자체 데이터베이스 드라이버, `HTTP` 클라이언트와 서버를 갖고 있습니다.

이는 심각한 문제를 초래합니다:

- **코드 중복** — 각 확장은 `MySQL`, `PostgreSQL`, `Redis` 등의 드라이버를 다시 작성해야 함
- **비호환성** — `Swoole`용으로 작성된 라이브러리는 `AMPHP`에서 동작하지 않으며, 그 반대도 마찬가지
- **한계** — 확장은 표준 `PHP` 함수(`file_get_contents`, `fread`, `curl_exec`)를
  논블로킹으로 만들 수 없음. 코어에 접근할 수 없기 때문
- **진입 장벽** — 개발자는 익숙한 도구를 사용하는 대신 별도의 생태계를 배워야 함

## 해결책: 코어 통합

`TrueAsync`는 다른 접근 방식을 취합니다 — **PHP 코어 수준의 비동기**.
이는 다음을 의미합니다:

### 투명성

기존 동기 코드가 코루틴에서 변경 없이 작동합니다.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — 이 모든 함수가
코루틴 내에서 실행될 때 자동으로 논블로킹이 됩니다.

```php
// 이 코드는 이미 동시에 실행됩니다!
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // HTTP 요청 중 코루틴이 중단되고,
    // 다른 코루틴이 계속 실행됩니다
});
```

### 컬러드 함수 없음

Python(`async def` / `await`)이나 JavaScript(`async` / `await`)와 달리,
`TrueAsync`는 함수를 비동기로 표시할 필요가 없습니다.
어떤 함수든 코루틴 내에서 실행할 수 있습니다 — "동기"와 "비동기" 세계의 구분이 없습니다.

### 통일된 표준

`Zend`의 일부로서 표준 `True Async ABI`는 **모든** 확장이 논블로킹 `I/O`를 지원할 수 있게 합니다:
`MySQL`, `PostgreSQL`, `Redis`, 파일 작업, 소켓 — 모두 단일 인터페이스를 통해.
각 비동기 프레임워크마다 드라이버를 중복할 필요가 없습니다.

### 하위 호환성

기존 코드는 계속 작동하지만, 이제 모든 PHP 코드가
기본적으로 비동기입니다. 어디서든.

## PHP 워크로드: 지금 이것이 중요한 이유

일반적인 PHP 애플리케이션(Laravel, Symfony, WordPress)은
시간의 **70–90%를 I/O 대기**에 소비합니다: 데이터베이스 쿼리, 외부 API로의 HTTP 호출,
파일 읽기. 그 모든 시간 동안 CPU는 유휴 상태입니다.

코루틴을 사용하면 이 시간이 효율적으로 사용됩니다:

| 시나리오                       | 코루틴 없이      | 코루틴 사용      |
|-------------------------------|-----------------|-----------------|
| 각 20ms의 DB 쿼리 3개          | 60ms            | ~22ms           |
| HTTP + DB + 파일               | 순차적           | 병렬            |
| API 호출 10개                  | 10 × 지연 시간   | ~1 × 지연 시간   |

더 알아보기:
[IO-Bound vs CPU-Bound](/ko/docs/evidence/concurrency-efficiency.html),
[동시성 통계](/ko/docs/evidence/real-world-statistics.html).

## 실용적 시나리오

- **웹 서버** — 단일 프로세스에서 많은 요청 처리
  (`FrankenPHP`, `RoadRunner`)
- **API 게이트웨이** — 여러 마이크로서비스의 데이터 병렬 집계
- **백그라운드 작업** — 동시 큐 처리
- **실시간** — WebSocket 서버, 챗봇, 스트리밍

## 참조:

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope와 구조적 동시성](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [TrueAsync 문서](/ko/docs.html)
- [대화형 코루틴 데모](/ko/interactive/coroutine-demo.html)
