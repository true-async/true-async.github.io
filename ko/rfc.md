---
layout: page
lang: ko
path_key: "/rfc.html"
nav_active: rfc
permalink: /ko/rfc.html
page_title: "RFC"
description: "PHP 코어에 비동기 기능을 추가하기 위한 공식 제안"
---

## PHP RFC: True Async

TrueAsync 프로젝트는 약 1년간 wiki.php.net의 공식 `RFC` 프로세스를 통해 추진되었습니다.
기본 동시성 모델과 구조적 동시성을 설명하는
두 개의 `RFC`가 발표되었습니다.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>저자: Edmond [HT]</span>
<span>버전: 1.7</span>
<span>대상 버전: PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

PHP의 동시성 모델을 정의하는 주요 `RFC`입니다.
코루틴, 함수 `spawn()` / `await()` / `suspend()`,
`Coroutine` 객체, `Awaitable` 및 `Completable` 인터페이스,
협력적 취소 메커니즘, `Fiber` 통합,
오류 처리 및 graceful shutdown을 설명합니다.

**핵심 원칙:**

- 동시성 활성화를 위한 기존 코드의 최소 변경
- 코루틴은 순차 실행의 환상을 유지
- I/O 작업 시 자동 코루틴 전환
- 협력적 취소 — "cancellable by design"
- 확장을 위한 표준 C API

[wiki.php.net에서 RFC 읽기 &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope와 구조적 동시성

<div class="rfc-meta">
<span>저자: Edmond [HT]</span>
<span>버전: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

기본 RFC의 확장입니다. 코루틴의 수명을 어휘 범위에
바인딩하는 `Scope` 클래스를 도입합니다.
Scope 계층 구조, 오류 전파,
"좀비" 코루틴 정책 및 `protect()`를 통한 임계 섹션을 설명합니다.

**해결하는 문제:**

- Scope 외부로의 코루틴 누수 방지
- Scope 종료 시 자동 리소스 정리
- 계층적 취소: 부모 취소 → 모든 자식 취소
- 임계 섹션의 취소로부터 보호
- 데드락 및 self-await 감지

[wiki.php.net에서 RFC 읽기 &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## 이 RFC들의 관계

첫 번째 `RFC`는 **저수준 프리미티브**를 정의합니다 — 코루틴,
기본 함수 및 확장을 위한 C API. 두 번째 RFC는
**구조적 동시성**을 추가합니다 — 동시성 코드를 안전하고 예측 가능하게 만드는
코루틴 그룹 관리 메커니즘.

함께 PHP를 위한 완전한 비동기 프로그래밍 모델을 형성합니다:

|              | RFC #1: True Async                | RFC #2: Scope                           |
|--------------|-----------------------------------|-----------------------------------------|
| **수준**     | 프리미티브                         | 관리                                    |
| **제공**     | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **유사점**   | Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **목표**     | 동시성 코드 실행                   | 안전한 생명주기 관리                     |

## 현재 RFC 상태

현재 `TrueAsync` 프로젝트는 `RFC` 프로세스에서 불확실성에 직면해 있습니다.
지난 몇 달간 논의가 사실상 중단되었으며, 미래에 대한 명확성이 없습니다.
`RFC`가 투표를 통과할 수 없다는 것이 꽤 명확하며, 이를 바꿀 방법이 없습니다.

이러한 이유로 `RFC` 프로세스는 현재 동결 상태로 간주되며,
프로젝트는 "공식" 지위 없이 오픈 커뮤니티 내에서 계속 발전할 것입니다.

## 논의에 참여하기

RFC는 [internals@lists.php.net](mailto:internals@lists.php.net) 메일링 리스트
및 [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}에서 논의됩니다.

또한 [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}에서 대화에 참여하세요.
