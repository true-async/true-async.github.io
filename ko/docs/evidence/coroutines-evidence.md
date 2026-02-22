---
layout: docs
lang: ko
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /ko/docs/evidence/coroutines-evidence.html
page_title: "코루틴이 작동하는 이유"
description: "경험적 근거: 컨텍스트 스위치 비용 측정, 메모리 비교, C10K 문제, 학술 연구."
---

# 경험적 근거: 단일 스레드 코루틴이 작동하는 이유

단일 스레드 협력적 동시성이 IO-bound 작업 부하에 효과적이라는 주장은
측정, 학술 연구, 대규모 시스템 운영 경험에 의해 뒷받침됩니다.

---

## 1. 전환 비용: 코루틴 vs OS 스레드

코루틴의 주요 장점은 협력적 전환이
OS 커널을 호출하지 않고 사용자 공간에서 발생한다는 것입니다.

### Linux에서의 측정

| 지표                   | OS 스레드 (Linux NPTL)                   | 코루틴 / 비동기 작업                  |
|------------------------|------------------------------------------|---------------------------------------|
| 컨텍스트 스위치         | 1.2–1.5 µs (고정), ~2.2 µs (비고정)     | ~170 ns (Go), ~200 ns (Rust async)    |
| 작업 생성              | ~17 µs                                   | ~0.3 µs                              |
| 작업당 메모리           | ~9.5 KiB (최소), 8 MiB (기본 스택)       | ~0.4 KiB (Rust), 2–4 KiB (Go)        |
| 확장성                 | ~80,000 스레드 (테스트)                   | 250,000+ 비동기 작업 (테스트)          |

**출처:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  Linux 스레드 전환 비용의 직접 측정 및 고루틴과의 비교
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  비동기 작업 전환 ~0.2 µs vs 스레드 ~1.7 µs (**8.5배** 빠름),
  생성 0.3 µs vs 17 µs (**56배** 빠름), 0.4 KiB vs 9.5 KiB 사용 (**24배** 적음)

### 실제로 의미하는 바

코루틴 전환 비용은 **~200 나노초**로 — OS 스레드 전환(~1.5 µs)보다
한 자릿수 저렴합니다.
하지만 더 중요한 것은, 코루틴 전환이 **간접 비용을 발생시키지 않는다**는 것입니다:
TLB 캐시 플러시, 분기 예측기 무효화, 코어 간 마이그레이션 —
이 모든 것은 스레드의 특성이지만, 단일 스레드 내 코루틴에는 해당되지 않습니다.

코어당 80개의 코루틴을 처리하는 이벤트 루프의 경우,
총 전환 오버헤드는:

```
80 × 200 ns = 모든 코루틴을 한 번씩 순회하는 데 16 µs
```

이는 80 ms의 I/O 대기 시간에 비하면 무시할 수 있는 수준입니다.

---

## 2. 메모리: 차이의 규모

OS 스레드는 고정 크기의 스택을 할당합니다 (Linux 기본 8 MiB).
코루틴은 상태만 저장합니다 — 지역 변수와 재개 지점.

| 구현                          | 동시성 단위당 메모리                                      |
|-------------------------------|-----------------------------------------------------------|
| Linux 스레드 (기본 스택)       | 8 MiB 가상, ~10 KiB RSS 최소                              |
| Go 고루틴                     | 2–4 KiB (동적 스택, 필요에 따라 증가)                     |
| Kotlin 코루틴                 | 힙에 수십 바이트; 스레드:코루틴 비율 ≈ 6:1                |
| Rust 비동기 작업              | ~0.4 KiB                                                 |
| C++ 코루틴 프레임 (Pigweed)   | 88–408 바이트                                             |
| Python asyncio 코루틴         | ~2 KiB (스레드의 ~5 KiB + 32 KiB 스택 대비)              |

**출처:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — 6:1 메모리 비율
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — Python에서의 비교
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — 동적 고루틴 스택

### 웹 서버에 대한 시사점

640개의 동시 작업 (8코어 × 80 코루틴)의 경우:

- **OS 스레드**: 640 × 8 MiB = 5 GiB 가상 메모리
  (실제로는 지연 할당으로 인해 더 적지만, OS 스케줄러에 대한 부담은 상당함)
- **코루틴**: 640 × 4 KiB = 2.5 MiB
  (**세 자릿수의 차이**)

---

## 3. C10K 문제와 실제 서버

### 문제

1999년, Dan Kegel은
[C10K 문제](https://www.kegel.com/c10k.html)를 정의했습니다:
"커넥션당 하나의 스레드" 모델을 사용하는 서버는
10,000개의 동시 연결을 처리할 수 없었습니다.
원인은 하드웨어 제한이 아니라 OS 스레드 오버헤드였습니다.

### 해결책

이 문제는 이벤트 기반 아키텍처로의 전환으로 해결되었습니다:
각 연결에 스레드를 생성하는 대신,
단일 이벤트 루프가 하나의 스레드에서 수천 개의 연결을 처리합니다.

이것이 바로 **nginx**, **Node.js**, **libuv**, 그리고 PHP 컨텍스트에서 **True Async**가 구현하는 접근 방식입니다.

### 벤치마크: nginx (이벤트 기반) vs Apache (요청당 스레드)

| 지표 (1000 동시 연결)          | nginx        | Apache                             |
|--------------------------------|--------------|-------------------------------------|
| 초당 요청 수 (정적)            | 2,500–3,000  | 800–1,200                          |
| HTTP/2 처리량                  | >6,000 req/s | ~826 req/s                         |
| 부하 시 안정성                 | 안정적       | >150 연결에서 성능 저하             |

nginx는 Apache보다 **2–4배** 더 많은 요청을 처리하면서도
메모리를 훨씬 적게 소비합니다.
요청당 스레드 아키텍처의 Apache는 (기본적으로) 최대 150개의 동시 연결만 수용하며,
그 이후 새 클라이언트는 대기열에서 기다립니다.

**출처:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — 문제 정의
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — 벤치마크
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — 업계 경험

---

## 4. 학술 연구

### SEDA: 단계별 이벤트 기반 아키텍처 (Welsh et al., 2001)

UC Berkeley의 Matt Welsh, David Culler, Eric Brewer는
SEDA — 이벤트와 처리 단계 간 큐를 기반으로 한 서버 아키텍처를 제안했습니다.

**핵심 결과**: Java로 구현된 SEDA 서버가
10,000개 이상의 동시 연결에서 Apache(C, 커넥션당 스레드)를 처리량에서 능가했습니다.
Apache는 150개 이상의 동시 연결을 수용할 수 없었습니다.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### 웹 서버 아키텍처 비교 (Pariag et al., 2007)

아키텍처에 대한 가장 철저한 비교는 Waterloo 대학의 Pariag 등에 의해 수행되었습니다.
동일한 코드베이스에서 세 가지 서버를 비교했습니다:

- **µserver** — 이벤트 기반 (SYMPED, 단일 프로세스)
- **Knot** — 커넥션당 스레드 (Capriccio 라이브러리)
- **WatPipe** — 하이브리드 (파이프라인, SEDA와 유사)

**핵심 결과**: 이벤트 기반 µserver와 파이프라인 기반 WatPipe는
스레드 기반 Knot보다 **~18% 높은 처리량**을 달성했습니다.
WatPipe는 10개의 프로세스를 가진 µserver와 동일한 성능을 달성하기 위해
25개의 writer 스레드가 필요했습니다.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: 코루틴을 통한 이벤트 처리 가속 (2022)

arXiv에 발표된 연구에서 스트림 데이터 처리(이벤트 기반 처리)에 대한
코루틴과 스레드의 직접 비교를 수행했습니다.

**핵심 결과**: 코루틴은 이벤트 스트림 처리에서
기존 스레드 대비 **최소 2배의 처리량**을 달성했습니다.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. 확장성: 100,000개의 작업

### Kotlin: 100 ms에 100,000개의 코루틴

[TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
벤치마크에서 100,000개의 코루틴 생성 및 실행에 ~100 ms의 오버헤드가 소요되었습니다.
동일한 수의 스레드는 생성만으로 ~1.7초
(100,000 × 17 µs)와 스택을 위한 ~950 MiB의 메모리가 필요합니다.

### Rust: 250,000개의 비동기 작업

[context-switch 벤치마크](https://github.com/jimblandy/context-switch)에서
단일 프로세스에서 250,000개의 비동기 작업이 실행되었으며,
OS 스레드는 ~80,000개에서 한계에 도달했습니다.

### Go: 수백만 개의 고루틴

Go는 프로덕션 시스템에서 일상적으로 수십만에서 수백만 개의 고루틴을 실행합니다.
이것이 Caddy, Traefik, CockroachDB와 같은 서버가
수만 개의 동시 연결을 처리할 수 있게 하는 것입니다.

---

## 6. 근거 요약

| 주장                                              | 확인                                                      |
|----------------------------------------------------|-----------------------------------------------------------|
| 코루틴 전환이 스레드보다 저렴                       | ~200 ns vs ~1500 ns — **7–8배** (Bendersky 2018, Blandy)  |
| 코루틴이 더 적은 메모리 소비                        | 0.4–4 KiB vs 9.5 KiB–8 MiB — **24배+** (Blandy, Go FAQ)  |
| 이벤트 기반 서버의 확장성이 더 우수                  | nginx 처리량 Apache 대비 2–4배 (벤치마크)                  |
| 이벤트 기반 > 커넥션당 스레드 (학술적)              | +18% 처리량 (Pariag 2007), C10K 해결 (Kegel 1999)         |
| 코루틴 > 이벤트 처리를 위한 스레드                  | 2배 처리량 (AEStream 2022)                                |
| 하나의 프로세스에서 수십만 개의 코루틴              | 250K 비동기 작업 (Rust), 100ms에 100K 코루틴 (Kotlin)      |
| N ≈ 1 + T_io/T_cpu 공식이 정확                     | Goetz 2006, Zalando, 리틀의 법칙                           |

---

## 참고 문헌

### 측정 및 벤치마크
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### 학술 논문
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### 업계 경험
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### 함께 보기
- [Python asyncio 실전](/ko/docs/evidence/python-evidence.html) — 프로덕션 사례 (Duolingo, Super.com, Instagram), uvloop 벤치마크, Cal Paterson의 반론
- [Swoole 실전](/ko/docs/evidence/swoole-evidence.html) — PHP 코루틴의 프로덕션 사례 및 벤치마크
