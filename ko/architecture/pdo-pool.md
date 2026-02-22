---
layout: architecture
lang: ko
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /ko/architecture/pdo-pool.html
page_title: "PDO Pool 아키텍처"
description: "PDO Pool의 내부 설계 -- 컴포넌트, 커넥션 생명주기, 코루틴 바인딩, 자격 증명 관리."
---

# PDO Pool 아키텍처

> 이 글은 PDO Pool의 내부 설계를 설명합니다.
> 사용 가이드를 찾고 계시다면 [PDO Pool: 커넥션 풀](/ko/docs/components/pdo-pool.html)을 참조하세요.

## 2단계 아키텍처

PDO Pool은 두 개의 레이어로 구성됩니다:

**1. PDO 코어 (`pdo_pool.c`)** -- 코루틴에 대한 커넥션 바인딩 로직,
트랜잭션 관리, 스테이트먼트 참조 카운팅.

**2. Async Pool (`zend_async_pool_t`)** -- 비동기 확장 모듈의 범용 리소스 풀.
여유 커넥션의 큐, 제한, 헬스체크를 관리합니다.
PDO에 대해 아무것도 모릅니다 -- 추상 `zval` 값으로 작동합니다.

이 분리를 통해 데이터베이스뿐만 아니라
모든 리소스에 대해 동일한 풀링 메커니즘을 사용할 수 있습니다.

## 컴포넌트 다이어그램

![PDO Pool -- 컴포넌트](/diagrams/ko/architecture-pdo-pool/components.svg)

## 템플릿 커넥션

풀과 함께 `PDO`를 생성할 때, 코어는 실제 TCP 연결을 **열지 않습니다**.
대신 **템플릿**이 생성됩니다 -- DSN, 사용자 이름, 비밀번호,
드라이버에 대한 참조를 저장하는 `pdo_dbh_t` 객체입니다. 모든 실제 커넥션은 나중에
이 템플릿을 기반으로 필요에 따라 생성됩니다.

템플릿에는 `db_handle_factory()` 대신 `db_handle_init_methods()`가 호출됩니다.
이 메서드는 드라이버의 메서드 테이블(`dbh->methods`)을 설정하지만
TCP 연결을 생성하거나 `driver_data`를 할당하지 않습니다.

## 커넥션 생명주기

![풀에서의 커넥션 생명주기](/diagrams/ko/architecture-pdo-pool/lifecycle.svg)

## 풀에서 커넥션 생성 (시퀀스)

![풀에서 커넥션 생성](/diagrams/ko/architecture-pdo-pool/connection-sequence.svg)

## 내부 API

### pdo_pool.c -- 공개 함수

| 함수                       | 용도                                                           |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | 생성자 속성을 기반으로 `pdo_dbh_t`용 풀 생성                    |
| `pdo_pool_destroy()`       | 모든 커넥션 해제, 풀 닫기, 해시 테이블 정리                     |
| `pdo_pool_acquire_conn()`  | 현재 코루틴의 커넥션 반환 (재사용 또는 획득)                    |
| `pdo_pool_peek_conn()`     | acquire 없이 바인딩된 커넥션 반환 (없으면 NULL)                 |
| `pdo_pool_maybe_release()` | 트랜잭션이나 스테이트먼트가 없으면 커넥션을 풀에 반환            |
| `pdo_pool_get_wrapper()`   | `getPool()` 메서드를 위한 `Async\Pool` PHP 객체 반환            |

### pdo_pool.c -- 내부 콜백

| 콜백                        | 호출 시점                                                    |
|-----------------------------|-----------------------------------------------------------|
| `pdo_pool_factory()`        | 풀에 새 커넥션이 필요할 때 (풀이 비어있을 때 acquire)          |
| `pdo_pool_destructor()`     | 풀이 커넥션을 파괴할 때 (닫기 또는 퇴출 시)                    |
| `pdo_pool_healthcheck()`    | 주기적 검사 -- 커넥션이 아직 살아있는지?                       |
| `pdo_pool_before_release()` | 풀에 반환하기 전 -- 커밋되지 않은 트랜잭션 롤백                |
| `pdo_pool_free_conn()`      | 드라이버 커넥션 닫기, 메모리 해제                              |

### 코루틴 바인딩

커넥션은 `pool_connections` 해시 테이블을 통해 코루틴에 바인딩됩니다.
키는 코루틴 식별자이고 값은 `pdo_dbh_t`에 대한 포인터입니다.

코루틴 식별자는 `pdo_pool_coro_key()` 함수로 계산됩니다:
- 코루틴이 PHP 객체인 경우 -- `zend_object.handle` (순차적 uint32_t) 사용
- 내부 코루틴의 경우 -- `ZEND_MM_ALIGNMENT_LOG2`만큼 시프트된 포인터 주소

### 코루틴 완료 시 정리

커넥션이 코루틴에 바인딩될 때, `coro->event.add_callback()`을 통해
`pdo_pool_cleanup_callback`이 등록됩니다. 코루틴이 완료되면 (정상적으로 또는 오류와 함께),
콜백이 자동으로 커넥션을 풀에 반환합니다. 이는 처리되지 않은 예외가 있어도
커넥션 누수가 발생하지 않도록 보장합니다.

### 피닝: 커넥션 잠금

커넥션은 다음 조건 중 하나 이상이 충족되면 코루틴에 고정되어 풀에 반환되지 않습니다:

- `conn->in_txn == true` -- 활성 트랜잭션
- `conn->pool_slot_refcount > 0` -- 이 커넥션을 사용하는 활성 스테이트먼트(`PDOStatement`)가 있음

refcount는 스테이트먼트 생성 시 증가하고 파괴 시 감소합니다.
두 조건이 모두 해제되면, `pdo_pool_maybe_release()`가 커넥션을 풀에 반환합니다.

## 팩토리에서의 자격 증명 관리

새 커넥션을 생성할 때, `pdo_pool_factory()`는 `estrdup()`를 통해 템플릿의
DSN, 사용자 이름, 비밀번호 문자열을 **복사**합니다. 이는
드라이버가 `db_handle_factory()` 중에 이 필드를 변경할 수 있기 때문입니다:

- **PostgreSQL** -- `data_source`에서 `;`를 공백으로 대체
- **MySQL** -- 전달되지 않은 경우 DSN에서 `username`/`password` 할당
- **ODBC** -- 자격 증명을 포함하여 `data_source`를 완전히 재구성

`db_handle_factory()` 호출이 성공하면 복사본은 `efree()`를 통해 해제됩니다.
오류 시에는 `pdo_pool_free_conn()`을 통해 해제됩니다.
이 함수는 풀의 소멸자에서도 사용됩니다.

## 영구 커넥션과의 비호환성

영구 커넥션(`PDO::ATTR_PERSISTENT`)은 풀과 호환되지 않습니다.
영구 커넥션은 프로세스에 바인딩되어 요청 간에 유지되는 반면,
풀은 자동 생명주기 관리와 함께 요청 수준에서 커넥션을 생성합니다.
두 속성을 동시에 활성화하려고 하면 오류가 발생합니다.

## 다음 단계

- [PDO Pool: 커넥션 풀](/ko/docs/components/pdo-pool.html) -- 사용 가이드
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴의 동작 방식
- [Scope](/ko/docs/components/scope.html) -- 코루틴 그룹 관리
