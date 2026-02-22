---
layout: architecture
lang: ko
path_key: "/architecture.html"
nav_active: architecture
permalink: /ko/architecture.html
page_title: "아키텍처"
description: "TrueAsync 컴포넌트의 내부 설계 -- 리소스 풀, PDO Pool, 다이어그램, C API."
---

## 개요

아키텍처 섹션에서는 C 코드 수준에서 TrueAsync 핵심 컴포넌트의 내부 설계를 설명합니다:
데이터 구조, 알고리즘, Zend Engine과의 통합,
PHP 코어와 비동기 확장 모듈 간의 상호작용.

이 자료는 TrueAsync가 "내부적으로" 어떻게 동작하는지 이해하거나
자체 확장 모듈을 만들 계획인 개발자를 위한 것입니다.

### [TrueAsync ABI](/ko/architecture/zend-async-api.html)

비동기 ABI의 핵심: 함수 포인터, 확장 모듈 등록 시스템,
전역 상태(`zend_async_globals_t`), `ZEND_ASYNC_*` 매크로,
API 버전 관리.

### [코루틴, 스케줄러, 리액터](/ko/architecture/scheduler-reactor.html)

코루틴 스케줄러와 이벤트 리액터의 내부 설계:
큐(순환 버퍼), fiber를 통한 컨텍스트 전환,
마이크로태스크, libuv 이벤트 루프, fiber 컨텍스트 풀, 그레이스풀 셧다운.

### [이벤트와 이벤트 모델](/ko/architecture/events.html)

`zend_async_event_t` -- 모든 비동기 프리미티브가
상속하는 기본 데이터 구조. 콜백 시스템, 참조 카운팅,
이벤트 참조, 플래그, 이벤트 타입 계층구조.

### [Waker -- 대기 및 깨우기 메커니즘](/ko/architecture/waker.html)

Waker는 코루틴과 이벤트 사이의 연결 고리입니다.
상태, `resume_when`, 코루틴 콜백, 오류 전달,
`zend_coroutine_t` 구조체, 스위치 핸들러.

### [비동기 컨텍스트에서의 가비지 컬렉션](/ko/architecture/async-gc.html)

PHP GC가 코루틴, 스코프, 컨텍스트와 함께 동작하는 방식: `get_gc` 핸들러,
fiber 스택 순회, 좀비 코루틴, 계층적 컨텍스트,
순환 참조 방지.

## 컴포넌트

### [Async\Pool](/ko/architecture/pool.html)

범용 리소스 풀. 다루는 주제:
- 2단계 데이터 구조 (코어의 ABI + 확장 모듈의 내부 구조)
- 대기 코루틴의 FIFO 큐를 사용한 획득/해제 알고리즘
- 주기적 타이머를 통한 헬스체크
- 세 가지 상태를 가진 서킷 브레이커
- 확장 모듈용 C API (`ZEND_ASYNC_POOL_*` 매크로)

### [PDO Pool](/ko/architecture/pdo-pool.html)

`Async\Pool` 위에 구축된 PDO 전용 레이어. 다루는 주제:
- 템플릿 커넥션과 실제 커넥션의 지연 생성
- HashTable을 통한 코루틴에 대한 커넥션 바인딩
- 활성 트랜잭션 및 스테이트먼트 중 피닝
- 코루틴 완료 시 자동 롤백 및 정리
- 팩토리에서의 자격 증명 관리
