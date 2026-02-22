---
layout: docs
lang: ko
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /ko/docs/evidence/real-world-statistics.html
page_title: "동시성 통계"
description: "동시성 계산을 위한 실제 통계 데이터: SQL 쿼리, DB 지연 시간, PHP 프레임워크 처리량."
---

# 동시성 계산을 위한 통계 데이터

[IO-bound 작업 효율성](/ko/docs/evidence/concurrency-efficiency.html) 섹션의 공식은
몇 가지 핵심 수량에 기반합니다. 아래는 공식에 구체적인 숫자를
대입할 수 있게 해주는 실제 측정 데이터 모음입니다.

---

## 공식 요소

리틀의 법칙:

$$
L = \lambda \cdot W
$$

- `L` — 필요한 동시성 수준 (동시에 처리할 작업 수)
- `λ` — 처리량 (초당 요청 수)
- `W` — 하나의 요청을 처리하는 평균 시간

괴츠의 공식:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — 요청당 I/O 대기 시간
- `T_cpu` — 요청당 CPU 계산 시간

실용적 계산을 위해 다음을 알아야 합니다:

1. **HTTP 요청당 몇 개의 SQL 쿼리가 실행되는가**
2. **하나의 SQL 쿼리가 얼마나 걸리는가 (I/O)**
3. **CPU 처리가 얼마나 걸리는가**
4. **서버 처리량은 얼마인가**
5. **전체 응답 시간은 얼마인가**

---

## 1. HTTP 요청당 SQL 쿼리 수

데이터베이스 호출 수는 프레임워크, ORM, 페이지 복잡도에 따라 다릅니다.

| 애플리케이션 / 프레임워크       | 페이지당 쿼리 수       | 출처                                                                                                             |
|---------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (플러그인 없음)       | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, 평균 페이지) | <30 (프로파일러 임계값) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                        |
| Laravel (단순 CRUD)             | 5–15                   | Laravel Debugbar의 일반적인 값                                                                                    |
| Laravel (N+1 문제 포함)         | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (캐시 없음)              | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (카탈로그)              | 50–200+                | 복잡한 전자상거래의 일반적인 값                                                                                   |

**일반적인 ORM 애플리케이션의 중앙값: HTTP 요청당 15–30개의 쿼리.**

Symfony는 30개의 쿼리를 "정상" 경계의 임계값으로 사용합니다 — 초과 시
프로파일러 아이콘이 노란색으로 변합니다.

## 2. SQL 쿼리당 시간 (쿼리당 T_io)

### DB 서버에서의 쿼리 실행 시간

Percona의 sysbench OLTP 벤치마크(MySQL) 데이터:

| 동시성        | <0.1 ms 쿼리 비율      | 0.1–1 ms | 1–10 ms | >10 ms |
|---------------|--------------------------|----------|---------|--------|
| 1 스레드      | 86%                      | 10%      | 3%      | 1%     |
| 32 스레드     | 68%                      | 30%      | 2%      | <1%    |
| 128 스레드    | 52%                      | 35%      | 12%     | 1%     |

LinkBench (Percona, 실제 Facebook 작업 부하 근사):

| 작업          | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0.4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0.7 ms | 47 ms | 100 ms |

**출처:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### 네트워크 지연 시간 (왕복)

| 시나리오                | 왕복 시간  | 출처   |
|-------------------------|------------|--------|
| Unix-socket / localhost | <0.1 ms    | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, 단일 데이터 센터   | ~0.5 ms   | CYBERTEC PostgreSQL |
| 클라우드, cross-AZ      | 1–5 ms    | CYBERTEC PostgreSQL |
| Cross-region            | 10–50 ms  | 일반적인 값 |

### 총합: SQL 쿼리당 전체 시간

전체 시간 = 서버 측 실행 시간 + 네트워크 왕복 시간.

| 환경              | 단순 SELECT (p50) | 평균 쿼리 (p50)     |
|-------------------|---------------------|---------------------|
| Localhost         | 0.1–0.5 ms         | 0.5–2 ms            |
| LAN (단일 DC)     | 0.5–1.5 ms         | 1–4 ms              |
| 클라우드 (cross-AZ) | 2–6 ms           | 3–10 ms             |

클라우드 환경에서 **평균 쿼리당 4 ms**는 충분히 근거 있는 추정치입니다.

## 3. SQL 쿼리당 CPU 시간 (쿼리당 T_cpu)

CPU 시간은 결과 파싱, ORM 엔티티 하이드레이션,
객체 매핑, 직렬화를 포함합니다.

이 특정 값에 대한 직접적인 벤치마크는 공개 소스에서 드물지만,
프로파일러 데이터에서 추정할 수 있습니다:

- Blackfire.io는 wall time을 **I/O 시간**과 **CPU 시간**으로 분리합니다
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- 일반적인 PHP 애플리케이션에서 데이터베이스가 주요 병목이며,
  CPU 시간은 wall time의 작은 비율을 차지합니다
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**처리량을 통한 간접 추정:**

Doctrine(DB + Twig 렌더링)을 사용하는 Symfony는 ~1000 req/s를 처리합니다
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
이는 요청당 CPU 시간 ≈ 1 ms를 의미합니다.
페이지당 ~20개의 SQL 쿼리 → **SQL 쿼리당 ~0.05 ms CPU**.

Laravel API 엔드포인트 (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
요청당 CPU 시간 ≈ 2.3 ms. ~15개의 쿼리 → **SQL 쿼리당 ~0.15 ms CPU**.

## 4. PHP 애플리케이션의 처리량 (λ)

30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15개의 동시 연결에서의 벤치마크 ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| 애플리케이션 | 페이지 유형            | req/s (PHP 8.4) |
|-------------|------------------------|-----------------|
| Laravel     | Welcome (DB 없음)      | ~700            |
| Laravel     | API + Eloquent + Auth  | ~440            |
| Symfony     | Doctrine + Twig        | ~1,000          |
| WordPress   | 홈페이지 (플러그인 없음) | ~148           |
| Drupal 10   | —                      | ~1,400          |

WordPress가 상당히 느린 것은
각 요청이 더 무겁기 때문입니다 (더 많은 SQL 쿼리, 더 복잡한 렌더링).

---

## 5. 프로덕션에서의 전체 응답 시간 (W)

LittleData 데이터 (2023년, 2,800개 전자상거래 사이트):

| 플랫폼                  | 평균 서버 응답 시간     |
|-------------------------|-------------------------|
| Shopify                 | 380 ms                  |
| 전자상거래 평균         | 450 ms                  |
| WooCommerce (WordPress) | 780 ms                  |
| Magento                 | 820 ms                  |

**출처:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

업계 벤치마크:

| 카테고리              | API 응답 시간     |
|-----------------------|-------------------|
| 우수                  | 100–300 ms        |
| 허용 가능             | 300–600 ms        |
| 최적화 필요           | >600 ms           |

## 리틀의 법칙을 사용한 실용적 계산

### 시나리오 1: 클라우드의 Laravel API

**입력 데이터:**
- λ = 440 req/s (목표 처리량)
- W = 80 ms (계산: 20 SQL × 4 ms I/O + 1 ms CPU)
- 코어: 8

**계산:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ 동시 작업}
$$

8코어에서 코어당 ~4.4개의 작업. 이는 15개의 동시
PHP-FPM 워커로 이미 440 req/s를 달성한다는 사실과 일치합니다. 여유가 있습니다.

### 시나리오 2: 클라우드의 Laravel API, 2000 req/s (목표)

**입력 데이터:**
- λ = 2000 req/s (목표 처리량)
- W = 80 ms
- 코어: 8

**계산:**

$$
L = 2000 \times 0.080 = 160 \text{ 동시 작업}
$$

PHP-FPM은 8코어에서 160개의 워커를 처리할 수 없습니다 — 각 워커는
~30–50 MB의 메모리를 가진 별도의 프로세스입니다. 총합: 워커만으로 ~6–8 GB.

코루틴의 경우: 160개의 작업 × ~4 KiB ≈ **640 KiB**. **네 자릿수의 차이**입니다.

### 시나리오 3: 괴츠의 공식 사용

**입력 데이터:**
- T_io = 80 ms (20개 쿼리 × 4 ms)
- T_cpu = 1 ms
- 코어: 8

**계산:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ 코루틴}
$$

**처리량** (리틀의 법칙으로):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

이는 8코어 완전 활용 시의 이론적 상한입니다.
실제로는 스케줄러 오버헤드, GC, 커넥션 풀 제한으로 인해 더 낮을 것입니다.
하지만 이 값의 50% (4,000 req/s)만으로도
동일한 8코어의 PHP-FPM 440 req/s보다 **한 자릿수 이상** 많습니다.

## 요약: 숫자의 출처

| 수량                               | 값               | 출처                                      |
|------------------------------------|------------------|-------------------------------------------|
| HTTP 요청당 SQL 쿼리 수           | 15–30            | WordPress ~17, Symfony 임계값 <30         |
| SQL 쿼리당 시간 (클라우드)         | 3–6 ms           | Percona p50 + CYBERTEC 왕복 시간          |
| SQL 쿼리당 CPU                    | 0.05–0.15 ms     | 처리량 벤치마크로부터의 역계산             |
| Laravel 처리량                    | ~440 req/s (API) | Sevalla/Kinsta 벤치마크, PHP 8.4          |
| 전자상거래 응답 시간 (평균)       | 450 ms           | LittleData, 2,800개 사이트                |
| API 응답 시간 (기준)              | 100–300 ms       | 업계 벤치마크                              |

---

## 참고 문헌

### PHP 프레임워크 벤치마크
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — WordPress, Laravel, Symfony, Drupal 처리량
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API 엔드포인트

### 데이터베이스 벤치마크
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — 작업별 p50/p95/p99
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — 다양한 동시성에서의 지연 시간 분포
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — 환경별 네트워크 지연 시간
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — <10ms / >100ms 임계값

### 프로덕션 시스템 응답 시간
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2,800개 전자상거래 사이트

### PHP 프로파일링
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — wall time의 I/O와 CPU 분해
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — PHP 애플리케이션용 APM
