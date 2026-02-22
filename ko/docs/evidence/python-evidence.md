---
layout: docs
lang: ko
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /ko/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio 실전: Duolingo, Super.com, Instagram, uvloop 벤치마크, 반론."
---

# Python asyncio 실전: 실제 측정 데이터

Python은 실행 모델 측면에서 PHP와 가장 유사한 언어입니다:
인터프리터 기반, 단일 스레드(GIL), 동기식 프레임워크가 지배적입니다.
동기식 Python(Flask, Django + Gunicorn)에서 비동기식
(FastAPI, aiohttp, Starlette + Uvicorn)으로의 전환은
PHP-FPM에서 코루틴 기반 런타임으로의 전환과 정확한 유사점입니다.

아래는 프로덕션 사례, 독립 벤치마크, 측정 데이터 모음입니다.

---

## 1. 프로덕션: Duolingo — 비동기 Python으로 마이그레이션 (+40% 처리량)

[Duolingo](https://blog.duolingo.com/async-python-migration/)는 세계 최대의
언어 학습 플랫폼(5억명 이상의 사용자)입니다.
백엔드는 Python으로 작성되어 있습니다.

2025년, 팀은 동기식 Python에서 비동기식으로의 체계적인 서비스 마이그레이션을 시작했습니다.

| 지표                  | 결과                                    |
|-----------------------|-----------------------------------------|
| 인스턴스당 처리량      | **+40%**                               |
| AWS EC2 비용 절감     | 마이그레이션된 서비스당 **~30%**          |

저자들은 비동기 인프라를 구축한 후 개별 서비스 마이그레이션이
"상당히 간단"하다고 밝혔습니다.

**출처:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. 프로덕션: Super.com — 90% 비용 절감

[Super.com](https://www.super.com/) (이전 Snaptravel)은 호텔 검색
및 할인 서비스입니다. 검색 엔진은 1,000+ req/s를 처리하고,
하루 1 TB 이상의 데이터를 수집하며, 일일 $1M 이상의 매출을 처리합니다.

**핵심 작업 부하 특성:** 각 요청이 서드파티 API에 대한
**40개 이상의 네트워크 호출**을 수행합니다. 이는 순수 I/O-bound 프로필로 — 코루틴에 이상적인 후보입니다.

팀은 Flask(동기식, AWS Lambda)에서 Quart(ASGI, EC2)로 마이그레이션했습니다.

| 지표                     | Flask (Lambda) | Quart (ASGI)  | 변화            |
|--------------------------|----------------|---------------|-----------------|
| 인프라 비용              | ~$1,000/일     | ~$50/일       | **−90%**        |
| 처리량                   | ~150 req/s     | 300+ req/s    | **2배**         |
| 피크 시간 오류           | 기준           | −95%          | **−95%**        |
| 지연 시간                | 기준           | −50%          | **2배 빠름**    |

일일 $950 × 365 = 단일 서비스에서 **연간 ~$350,000** 절약.

**출처:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. 프로덕션: Instagram — 5억 DAU 규모의 asyncio

Instagram은 5억명 이상의 일일 활성 사용자를
Django 백엔드에서 처리합니다.

Jimmy Lai(Instagram 엔지니어)는 PyCon Taiwan 2018 발표에서
asyncio로의 마이그레이션을 설명했습니다:

- `requests`를 HTTP 호출용 `aiohttp`로 교체
- 내부 RPC를 `asyncio`로 마이그레이션
- API 성능 향상 및 CPU 유휴 시간 감소 달성

**과제:** Instagram 규모에서의 높은 asyncio CPU 오버헤드,
정적 코드 분석을 통한 블로킹 호출의
자동 감지 필요성.

**출처:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. 프로덕션: Feature Store — 스레드에서 asyncio로 (−40% 지연 시간)

Feature Store 서비스가 Python 멀티스레딩에서 asyncio로 마이그레이션했습니다.

| 지표            | 스레드                    | Asyncio              | 변화                    |
|-----------------|---------------------------|----------------------|-------------------------|
| 지연 시간       | 기준                      | −40%                 | **−40%**                |
| RAM 소비        | 18 GB (수백 개의 스레드)   | 상당히 적음          | 대폭 감소              |

마이그레이션은 검증을 위해 50/50 프로덕션 트래픽
분할과 함께 3단계로 수행되었습니다.

**출처:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. 프로덕션: Talk Python — Flask에서 Quart로 (−81% 지연 시간)

[Talk Python](https://talkpython.fm/)은 최대 규모의 Python 팟캐스트
및 학습 플랫폼 중 하나입니다. 저자(Michael Kennedy)가
Flask(동기식)에서 Quart(비동기 Flask)로 사이트를 재작성했습니다.

| 지표                  | Flask | Quart | 변화        |
|-----------------------|-------|-------|-------------|
| 응답 시간 (예시)       | 42 ms | 8 ms | **−81%**    |
| 마이그레이션 후 버그   | —     | 2     | 최소        |

저자는 부하 테스트 시 최대 req/s는
MongoDB 쿼리가 <1 ms이므로 큰 차이가 없었다고 언급합니다.
이득은 **동시** 요청 처리 시 나타납니다 —
여러 클라이언트가 동시에 서버에 접근할 때입니다.

**출처:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — 표준으로서의 uvloop

Microsoft는 [uvloop](https://github.com/MagicStack/uvloop) —
libuv 기반의 빠른 이벤트 루프(Node.js의 기반이 되는 동일한 라이브러리) — 를
Python 3.13+의 Azure Functions 기본값으로 포함시켰습니다.

| 테스트                         | 표준 asyncio     | uvloop      | 개선        |
|--------------------------------|------------------|-------------|-------------|
| 10K 요청, 50 VU (로컬)        | 515 req/s        | 565 req/s   | **+10%**    |
| 5분, 100 VU (Azure)           | 1,898 req/s      | 1,961 req/s | **+3%**     |
| 500 VU (로컬)                 | 720 req/s        | 772 req/s   | **+7%**     |

500 VU에서 표준 이벤트 루프는 **~2% 요청 손실**을 보였습니다.
uvloop — 오류 제로.

**출처:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. 벤치마크: I/O-bound 작업 — asyncio 130배 빠름

10,000개의 URL 다운로드 작업에서 동시성 모델의 직접 비교:

| 모델         | 시간     | 처리량         | 오류      |
|--------------|----------|----------------|-----------|
| 동기식       | ~1,800 s | ~11 KB/s       | —         |
| 스레드 (100) | ~85 s    | ~238 KB/s      | 낮음      |
| **Asyncio**  | **14 s** | **1,435 KB/s** | **0.06%** |

Asyncio: 동기식 코드보다 **130배 빠름**, 스레드보다 **6배 빠름**.

CPU-bound 작업에서는 asyncio가 이점을 제공하지 않습니다
(동일한 시간, +44% 메모리 소비).

**출처:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. 벤치마크: uvloop — Go와 Node.js보다 빠름

[uvloop](https://github.com/MagicStack/uvloop)은 표준
asyncio 이벤트 루프의 드롭인 대체품으로, libuv(Node.js의 기반이 되는 동일한 라이브러리) 위에
Cython으로 작성되었습니다.

TCP 에코 서버:

| 구현                | 1 KiB (req/s) | 100 KiB 처리량  |
|---------------------|---------------|-----------------|
| **uvloop**          | **105,459**   | **2.3 GiB/s**   |
| Go                  | 103,264       | —               |
| 표준 asyncio        | 41,420        | —               |
| Node.js             | 44,055        | —               |

HTTP 서버 (300 동시):

| 구현                   | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37,866**    |
| Node.js                | 더 낮음       |

uvloop: 표준 asyncio보다 **2.5배 빠름**, Node.js보다 **2배 빠름**,
**Go와 동등**.

**출처:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. 벤치마크: aiohttp vs requests — 동시 요청에서 10배

| 라이브러리    | req/s (동시)         | 유형  |
|---------------|----------------------|-------|
| **aiohttp**   | **241+**             | 비동기|
| HTTPX (async) | ~160                 | 비동기|
| Requests      | ~24                  | 동기  |

aiohttp: 동시 HTTP 요청에서 Requests보다 **10배 빠름**.

**출처:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. 반론: Cal Paterson — "비동기 Python은 더 빠르지 않다"

반론을 제시하는 것도 중요합니다. Cal Paterson은 **실제 데이터베이스**
(PostgreSQL, 랜덤 행 선택 + JSON)를 사용한 철저한 벤치마크를 수행했습니다:

| 프레임워크                   | 유형  | req/s     | P99 지연 시간 |
|------------------------------|-------|-----------|---------------|
| Gunicorn + Meinheld/Bottle   | 동기  | **5,780** | **32 ms**     |
| Gunicorn + Meinheld/Falcon   | 동기  | **5,589** | **31 ms**     |
| Uvicorn + Starlette          | 비동기| 4,952     | 75 ms         |
| Sanic                        | 비동기| 4,687     | 85 ms         |
| AIOHTTP                      | 비동기| 4,501     | 76 ms         |

**결과:** C 서버를 사용하는 동기식 프레임워크가 **더 높은 처리량**과
**2–3배 더 나은 테일 지연 시간** (P99)을 보였습니다.

### 비동기가 왜 졌는가?

이유:

1. HTTP 요청당 **단일 SQL 쿼리** — 코루틴 동시성이
   효과를 발휘하기엔 너무 적은 I/O.
2. 요청 간 CPU 작업이 있는 **협력적 멀티태스킹**은
   "불공정한" CPU 시간 분배를 만들어 —
   긴 계산이 모든 사람의 이벤트 루프를 블록합니다.
3. **asyncio 오버헤드** (Python의 표준 이벤트 루프)가
   I/O가 최소일 때 논블로킹 I/O의 이득과 비슷합니다.

### 비동기가 실제로 도움이 되는 경우

Paterson의 벤치마크는 **가장 단순한 시나리오** (1개의 SQL 쿼리)를 테스트합니다.
위의 프로덕션 사례들이 보여주듯이, 비동기는 다음과 같은 경우 극적인 이득을 제공합니다:

- DB / 외부 API 쿼리가 **많을** 때 (Super.com: 요청당 40개 이상의 호출)
- 동시성이 **높을** 때 (수천 개의 동시 연결)
- I/O가 CPU보다 **지배적**일 때 (Duolingo, Appwrite)

이는 이론과 일치합니다:
블로킹 계수(T_io/T_cpu)가 높을수록 코루틴의 이점이 커집니다.
1개의 SQL 쿼리 × 2 ms에서는 계수가 너무 낮습니다.

**출처:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: Python 프레임워크

[TechEmpower Round 22](https://www.techempower.com/benchmarks/)의 대략적 결과:

| 프레임워크        | 유형       | req/s (JSON)          |
|-------------------|------------|-----------------------|
| Uvicorn (raw)     | 비동기 ASGI | Python 중 최고       |
| Starlette         | 비동기 ASGI | ~20,000–25,000       |
| FastAPI           | 비동기 ASGI | ~15,000–22,000       |
| Flask (Gunicorn)  | 동기 WSGI  | ~4,000–6,000          |
| Django (Gunicorn) | 동기 WSGI  | ~2,000–4,000          |

비동기 프레임워크: JSON 테스트에서 동기식 대비 **3–5배** 빠름.

**출처:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## 요약: Python 데이터가 보여주는 것

| 사례                       | 동기 → 비동기                          | 조건                                   |
|----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (프로덕션)        | **+40%** 처리량, **−30%** 비용         | 마이크로서비스, I/O                    |
| Super.com (프로덕션)       | **2배** 처리량, **−90%** 비용          | 요청당 40개 이상의 API 호출            |
| Feature Store (프로덕션)   | **−40%** 지연 시간                     | 스레드에서 asyncio로 마이그레이션      |
| Talk Python (프로덕션)     | **−81%** 지연 시간                     | Flask → Quart                          |
| I/O-bound (10K URL)        | **130배** 빠름                         | 순수 I/O, 대규모 동시성               |
| aiohttp vs requests        | **10배** 빠름                          | 동시 HTTP 요청                         |
| uvloop vs 표준             | **2.5배** 빠름                         | TCP 에코, HTTP                         |
| TechEmpower JSON           | **3–5배**                              | FastAPI/Starlette vs Flask/Django      |
| **단순 CRUD (1 SQL)**      | **동기가 더 빠름**                     | Cal Paterson: 비동기의 P99 2–3배 나쁨  |
| **CPU-bound**              | **차이 없음**                          | +44% 메모리, 0% 이득                   |

### 핵심 요점

비동기 Python은 **높은 블로킹 계수**에서 최대 이점을 제공합니다:
I/O 시간이 CPU 시간을 크게 초과할 때.
40개 이상의 네트워크 호출(Super.com) — 90% 비용 절감.
1개의 SQL 쿼리(Cal Paterson) — 비동기가 더 느림.

이는 [IO-bound 작업 효율성](/ko/docs/evidence/concurrency-efficiency.html)의 **공식을 확인**합니다:
이득 ≈ 1 + T_io/T_cpu. T_io >> T_cpu일 때 — 수십에서 수백 배.
T_io ≈ T_cpu일 때 — 최소 또는 제로.

---

## PHP 및 True Async와의 연관성

Python과 PHP는 유사한 상황에 있습니다:

| 특성                   | Python               | PHP                 |
|------------------------|----------------------|---------------------|
| 인터프리터 기반        | 예                   | 예                  |
| GIL / 단일 스레드      | GIL                  | 단일 스레드         |
| 지배적 모델            | 동기 (Django, Flask) | 동기 (FPM)          |
| 비동기 런타임          | asyncio + uvloop     | Swoole / True Async |
| 비동기 프레임워크      | FastAPI, Starlette   | Hyperf              |

Python 데이터는 단일 스레드 인터프리터 언어에서
코루틴으로의 전환이 **작동한다**는 것을 보여줍니다. 이득의 규모는
언어가 아닌 작업 부하 프로필에 의해 결정됩니다.

---

## 참고 문헌

### 프로덕션 사례
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### 벤치마크
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### 코루틴 vs 스레드
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
