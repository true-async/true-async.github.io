---
layout: docs
lang: ko
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /ko/docs/evidence/swoole-evidence.html
page_title: "Swoole 실전"
description: "Swoole 실전: Appwrite와 IdleMMO의 프로덕션 사례, 독립 벤치마크, TechEmpower, PHP-FPM과의 비교."
---

# Swoole 실전: 실제 측정 데이터

Swoole은 이벤트 루프, 코루틴, 비동기 I/O를 제공하는
C로 작성된 PHP 확장입니다. 수년간의 프로덕션 경험을 가진
PHP 생태계에서 유일하게 성숙한 코루틴 모델 구현체입니다.

아래는 실제 측정 데이터 모음입니다: 프로덕션 사례, 독립 벤치마크,
TechEmpower 데이터.

### 두 가지 성능 향상 원천

PHP-FPM에서 Swoole로의 전환은 **두 가지 독립적인** 이점을 제공합니다:

1. **상태 유지 런타임** — 애플리케이션이 한 번 로드되어 메모리에 유지됩니다.
   매 요청마다의 재초기화 오버헤드(autoload, DI 컨테이너, 설정)가
   사라집니다. 이 효과는 I/O 없이도 이득을 제공합니다.

2. **코루틴 동시성** — 하나의 코루틴이 DB나 외부 API 응답을 기다리는 동안,
   다른 코루틴들이 동일한 코어에서 요청을 처리합니다. 이 효과는
   **I/O가 있을 때만** 나타나며 비동기 클라이언트
   (코루틴 기반 MySQL, Redis, HTTP 클라이언트)의 사용이 필요합니다.

대부분의 공개 벤치마크는 이 두 효과를 **분리하지 않습니다**.
DB 없는 테스트(Hello World, JSON)는 상태 유지 효과만 측정합니다.
DB 포함 테스트는 **둘의 합**을 측정하지만, 코루틴 기여분을 분리할 수는 없습니다.

아래 각 섹션에서 어떤 효과가 주로 작용하는지 표시합니다.

## 1. 프로덕션: Appwrite — FPM에서 Swoole로 마이그레이션 (+91%)

> **측정 대상:** 상태 유지 런타임 **+** 코루틴 동시성.
> Appwrite는 최소한의 CPU 작업을 수행하는 I/O 프록시입니다. 이득은
> 두 요인 모두에서 오지만, 공개 데이터에서 코루틴 기여분을 분리하는 것은 불가능합니다.

[Appwrite](https://appwrite.io/)는 PHP로 작성된 오픈소스 Backend-as-a-Service(BaaS)입니다.
Appwrite는 모바일 및 웹 애플리케이션의 일반적인 작업을 위한
즉시 사용 가능한 서버 API를 제공합니다:
사용자 인증, 데이터베이스 관리,
파일 저장소, 클라우드 함수, 푸시 알림.

본질적으로 Appwrite는 **순수 I/O 프록시**입니다:
거의 모든 수신 HTTP 요청이 하나 이상의
I/O 작업(MariaDB 쿼리, Redis 호출,
파일 읽기/쓰기)으로 변환되며, 자체적인 CPU 계산은 최소입니다.
이러한 작업 부하 프로필은 코루틴으로의 전환에서
최대 이점을 추출합니다: 하나의 코루틴이 DB 응답을 기다리는 동안,
다른 코루틴들이 동일한 코어에서 새 요청을 처리합니다.

버전 0.7에서 팀은 Nginx + PHP-FPM을 Swoole로 교체했습니다.

**테스트 조건:**
500명의 동시 클라이언트, 5분간의 부하(k6).
모든 요청은 인증 및 남용 제어가 있는 엔드포인트.

| 지표                         | FPM (v0.6.2)  | Swoole (v0.7) | 변화            |
|------------------------------|---------------|---------------|-----------------|
| 초당 요청 수                  | 436           | 808           | **+85%**        |
| 5분간 총 요청 수              | 131,117       | 242,336       | **+85%**        |
| 응답 시간 (정상)              | 3.77 ms       | 1.61 ms       | **−57%**        |
| 응답 시간 (부하 시)           | 550 ms        | 297 ms        | **−46%**        |
| 요청 성공률                   | 98%           | 100%          | 타임아웃 없음   |

팀이 보고한 전체 개선: 복합 지표 기준 **~91%**.

**출처:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. 프로덕션: IdleMMO — 단일 서버에서 하루 3,500만 요청

> **측정 대상:** 주로 **상태 유지 런타임**.
> Laravel Octane은 Swoole를 "하나의 요청 — 하나의 워커" 모드로 실행하며,
> 요청 내 코루틴 I/O 멀티플렉싱은 없습니다.
> 성능 향상은 Laravel이 매 요청마다 리로드하지 않기 때문입니다.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)는
PHP 애플리케이션(Laravel Octane + Swoole)으로, 160,000명 이상의 사용자를 보유한 MMORPG입니다.

| 지표                       | 값                                |
|----------------------------|-----------------------------------|
| 일일 요청 수               | 35,000,000 (평균 ~405 req/s)      |
| 잠재력 (저자 추정)          | 50,000,000+ req/일                |
| 서버                       | 1 × 32 vCPU                      |
| Swoole 워커                | 64 (코어당 4개)                    |
| 튜닝 전 p95 지연 시간       | 394 ms                            |
| Octane 적용 후 p95 지연 시간 | **172 ms (−56%)**                |

저자는 CPU 집약적이지 않은 애플리케이션(MMORPG가 아닌 경우)의 경우
동일한 서버가 **상당히 더 많은** 요청을 처리할 수 있다고 언급합니다.

**출처:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. 벤치마크: PHP-FPM vs Swoole (BytePursuits)

> **측정 대상:** **상태 유지 런타임**만.
> 테스트는 DB나 외부 서비스 접근 없이 JSON을 반환합니다.
> 코루틴 동시성은 여기에 관여하지 않습니다 — 병렬로 수행할 수 있는
> I/O가 없습니다. 2.6–3배 차이는 전적으로
> Swoole이 매 요청마다 애플리케이션을 재생성하지 않기 때문입니다.

Mezzio 마이크로프레임워크에서의 독립 벤치마크(JSON 응답, DB 없음).
Intel i7-6700T (4코어 / 8스레드), 32 GB RAM, wrk, 10초.

| 동시성      | PHP-FPM (req/s) | Swoole BASE (req/s) | 차이       |
|-------------|-----------------|---------------------|------------|
| 100         | 3,472           | 9,090               | **2.6배**  |
| 500         | 3,218           | 9,159               | **2.8배**  |
| 1,000       | 3,065           | 9,205               | **3.0배**  |

1000 동시 연결 시 평균 지연 시간:
- FPM: **191 ms**
- Swoole: **106 ms**

**중요 포인트:** 500개의 동시 연결부터
PHP-FPM은 요청 손실을 시작했습니다(500에서 73,793 소켓 오류, 700에서 176,652).
Swoole은 모든 동시성 수준에서 **오류 제로**였습니다.

**출처:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. 벤치마크: 데이터베이스 포함 (kenashkov)

> **측정 대상:** **다른** 효과를 가진 테스트 세트.
> - Hello World, Autoload — 순수 **상태 유지 런타임** (I/O 없음).
> - SQL 쿼리, 실제 시나리오 — **상태 유지 + 코루틴**.
> - Swoole은 코루틴 기반 MySQL 클라이언트를 사용하여
> - DB 응답을 기다리는 동안 다른 요청을 처리할 수 있습니다.

더 현실적인 테스트 세트: Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100–1000 동시, 10,000 요청.

| 시나리오                               | Apache (100 동시)  | Swoole (100 동시)  | 차이       |
|----------------------------------------|--------------------|--------------------|------------|
| Hello World                            | 25,706 req/s       | 66,309 req/s       | **2.6배**  |
| 100개 클래스 Autoload                   | 2,074 req/s        | 53,626 req/s       | **25배**   |
| DB SQL 쿼리                            | 2,327 req/s        | 4,163 req/s        | **1.8배**  |
| 실제 시나리오 (캐시 + 파일 + DB)       | 141 req/s          | 286 req/s          | **2.0배**  |

1000 동시 연결 시:
- Apache **크래시** (연결 제한, 실패한 요청)
- Swoole — 모든 테스트에서 **오류 제로**

**핵심 관찰:** 실제 I/O(DB + 파일)에서 차이는
25배에서 **1.8–2배**로 줄어듭니다. 이는 예상된 것입니다:
데이터베이스가 공통 병목이 됩니다.
하지만 부하 시 안정성은 비교할 수 없습니다.

**출처:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. 벤치마크: Symfony 7 — 모든 런타임 (2024)

> **측정 대상:** **상태 유지 런타임**만.
> DB 없는 테스트 — 코루틴은 관여하지 않습니다.
> 1000 동시 연결에서 >10배 차이는 FPM이
> 요청당 프로세스를 생성하는 반면, Swoole과 FrankenPHP는
> 애플리케이션을 메모리에 유지하고 이벤트 루프를 통해 연결을 처리하기 때문입니다.

Symfony 7로 9개의 PHP 런타임 테스트(k6, Docker, 1 CPU / 1 GB RAM, DB 없음).

| 런타임                            | Nginx + PHP-FPM 대비 (1000 동시) |
|-----------------------------------|-----------------------------------|
| Apache + mod_php                  | ~0.5배 (더 느림)                  |
| Nginx + PHP-FPM                   | 1배 (기준)                        |
| Nginx Unit                        | ~3배                              |
| RoadRunner                        | >2배                              |
| **Swoole / FrankenPHP (worker)**  | **>10배**                         |

1000 동시 연결에서 Swoole과 워커 모드의 FrankenPHP는
클래식 Nginx + PHP-FPM보다
**한 자릿수 높은 처리량**을 보였습니다.

**출처:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower: Swoole — PHP 중 1위

> **측정 대상:** **상태 유지 + 코루틴** (DB 테스트).
> TechEmpower는 JSON 테스트(상태 유지)와 여러 SQL 쿼리를 포함한 테스트
> (multiple queries, Fortunes)를 모두 포함하며, 코루틴 기반 DB 접근이
> 실질적인 이점을 제공합니다. 이는 코루틴 효과가
> 가장 명확하게 보이는 몇 안 되는 벤치마크 중 하나입니다.

[TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023)에서 Swoole은 MySQL 테스트에서
모든 PHP 프레임워크 중 **1위**를 차지했습니다.

TechEmpower는 실제 시나리오를 테스트합니다: JSON 직렬화,
단일 DB 쿼리, 다중 쿼리, ORM, Fortunes
(템플릿 + DB + 정렬 + 이스케이핑).

**출처:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf: Swoole 프레임워크에서 96,000 req/s

> **측정 대상:** **상태 유지 런타임** (벤치마크는 Hello World).
> Hyperf는 전적으로 Swoole 코루틴 위에 구축되어 있으며, 프로덕션에서는
> DB, Redis, gRPC 호출에 코루틴 동시성이 활용됩니다.
> 하지만 96K req/s 수치는 I/O 없는 Hello World에서 얻어진 것으로,
> 상태 유지 런타임 효과를 반영합니다.

[Hyperf](https://hyperf.dev/)는 Swoole 위에 구축된 코루틴 기반 PHP 프레임워크입니다.
벤치마크(4 스레드, 100 연결):

- **96,563 req/s**
- 지연 시간: 7.66 ms

Hyperf는 마이크로서비스를 위해 포지셔닝되며
기존 PHP 프레임워크 대비 **5–10배** 이점을 주장합니다.

**출처:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## 요약: 실제 데이터가 보여주는 것

| 테스트 유형                      | FPM → Swoole                      | 주요 효과           | 참고                                          |
|----------------------------------|------------------------------------|---------------------|-----------------------------------------------|
| Hello World / JSON               | **2.6–3배**                        | 상태 유지           | BytePursuits, kenashkov                       |
| Autoload (상태 유지 vs 비유지)    | **25배**                           | 상태 유지           | I/O 없음 — 순수 상태 보존 효과                |
| 데이터베이스 포함                 | **1.8–2배**                        | 상태 유지 + 코루틴  | kenashkov (코루틴 MySQL)                      |
| 프로덕션 API (Appwrite)          | **+91%** (1.85배)                  | 상태 유지 + 코루틴  | I/O 프록시, 두 요인 모두                      |
| 프로덕션 (IdleMMO)               | p95: **−56%**                      | 상태 유지           | Octane 워커, 코루틴 아님                      |
| 높은 동시성 (1000+)              | **Swoole 안정, FPM 크래시**        | 이벤트 루프         | 모든 벤치마크                                 |
| Symfony 런타임 (1000 동시)       | **>10배**                          | 상태 유지           | 테스트에 DB 없음                               |
| TechEmpower (DB 테스트)          | **PHP 중 1위**                     | 상태 유지 + 코루틴  | 다중 SQL 쿼리                                 |

## 이론과의 연관성

결과는 [IO-bound 작업 효율성](/ko/docs/evidence/concurrency-efficiency.html)의 계산과 잘 일치합니다:

**1. 데이터베이스가 있을 때 차이는 없을 때(3–10배)보다 더 적습니다(1.8–2배).**
이는 확인해 줍니다: 실제 I/O에서 병목은 DB 자체가 되며,
동시성 모델이 아닙니다. DB 테스트에서 블로킹 계수가 낮은 이유는
프레임워크의 CPU 작업이 I/O 시간과 비슷하기 때문입니다.

**2. 높은 동시성(500–1000+)에서 FPM은 성능이 저하되지만 Swoole은 그렇지 않습니다.**
PHP-FPM은 워커 수에 의해 제한됩니다. 각 워커는 OS 프로세스(~40 MB)입니다.
500개 이상의 동시 연결에서 FPM은 한계에 도달하여
요청을 잃기 시작합니다. Swoole은 메모리 소비를 늘리지 않고
수십 개의 코루틴으로 수천 개의 연결을 처리합니다.

**3. 상태 유지 런타임은 재초기화 오버헤드를 제거합니다.**
autoload 테스트에서 25배 차이는 FPM에서 매 요청마다
애플리케이션 상태를 재생성하는 비용을 보여줍니다.
프로덕션에서 이는 T_cpu = 34 ms (FPM)와
T_cpu = 5–10 ms (상태 유지)의 차이로 나타나며, 이는 블로킹 계수를 극적으로 변화시키고
결과적으로 코루틴의 이득을 변화시킵니다
([IO-bound 작업 효율성의 표](/ko/docs/evidence/concurrency-efficiency.html) 참조).

**4. 공식이 확인되었습니다.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1.85배).
T_cpu가 ~30 ms에서 ~15 ms로 감소하고(상태 유지)
T_io가 ~30 ms로 유지된다면, 블로킹 계수는 1.0에서 2.0으로 증가하며,
이는 약 1.5–2배의 처리량 증가를 예측합니다. 이는 일치합니다.

## 참고 문헌

### 프로덕션 사례
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### 독립 벤치마크
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### 프레임워크 및 런타임
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — 코루틴 기반 PHP 프레임워크](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
