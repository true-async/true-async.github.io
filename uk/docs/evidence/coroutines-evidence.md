---
layout: docs
lang: uk
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /uk/docs/evidence/coroutines-evidence.html
page_title: "Чому корутини працюють"
description: "Емпіричні докази: виміри вартості перемикання контексту, порівняння пам'яті, проблема C10K, академічні дослідження."
---

# Емпіричні докази: чому однопотокові корутини працюють

Твердження, що однопотокова кооперативна конкурентність є ефективною
для IO-bound навантажень, підтверджується вимірами, академічними дослідженнями
та операційним досвідом великомасштабних систем.

---

## 1. Вартість перемикання: корутина vs потік ОС

Головна перевага корутин полягає в тому, що кооперативне перемикання відбувається
в просторі користувача, без виклику ядра ОС.

### Виміри на Linux

| Метрика                | Потік ОС (Linux NPTL)                    | Корутина / async-завдання              |
|------------------------|------------------------------------------|----------------------------------------|
| Перемикання контексту  | 1.2–1.5 мкс (pinned), ~2.2 мкс (unpinned) | ~170 нс (Go), ~200 нс (Rust async)  |
| Створення завдання     | ~17 мкс                                  | ~0.3 мкс                              |
| Пам'ять на завдання    | ~9.5 KiB (мін.), 8 MiB (стек за замовч.) | ~0.4 KiB (Rust), 2–4 KiB (Go)        |
| Масштабованість        | ~80 000 потоків (тест)                   | 250 000+ async-завдань (тест)          |

**Джерела:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  прямі виміри вартості перемикання потоків Linux та порівняння з горутинами
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  перемикання async-завдань за ~0.2 мкс проти ~1.7 мкс для потоку (**8.5x** швидше),
  створення за 0.3 мкс проти 17 мкс (**56x** швидше), використання 0.4 KiB проти 9.5 KiB (**24x** менше)

### Що це означає на практиці

Перемикання корутини коштує **~200 наносекунд** — на порядок дешевше,
ніж перемикання потоку ОС (~1.5 мкс).
Але ще важливіше те, що перемикання корутин **не має непрямих витрат**:
скидання кешу TLB, інвалідація предиктора розгалужень, міграція між ядрами —
все це характерно для потоків, але не для корутин у межах одного потоку.

Для event loop, що обслуговує 80 корутин на ядро,
загальні накладні витрати на перемикання становлять:

```
80 × 200 нс = 16 мкс на повний цикл по всіх корутинах
```

Це нехтовно мало порівняно з 80 мс часу очікування I/O.

---

## 2. Пам'ять: масштаб відмінностей

Потоки ОС виділяють стек фіксованого розміру (8 MiB за замовчуванням на Linux).
Корутини зберігають лише свій стан — локальні змінні та точку відновлення.

| Реалізація                    | Пам'ять на одиницю конкурентності                         |
|-------------------------------|-----------------------------------------------------------|
| Потік Linux (стек за замовч.) | 8 MiB віртуальної, ~10 KiB RSS мінімум                    |
| Горутина Go                   | 2–4 KiB (динамічний стек, росте за потребою)               |
| Корутина Kotlin               | десятки байтів у heap; співвідношення потік:корутина ≈ 6:1 |
| Async-завдання Rust           | ~0.4 KiB                                                  |
| Фрейм корутини C++ (Pigweed)  | 88–408 байтів                                             |
| Корутина Python asyncio       | ~2 KiB (проти ~5 KiB + 32 KiB стек для потоку)            |

**Джерела:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — співвідношення пам'яті 6:1
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — порівняння в Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — динамічний стек горутини

### Наслідки для веб-серверів

Для 640 конкурентних завдань (8 ядер × 80 корутин):

- **Потоки ОС**: 640 × 8 MiB = 5 GiB віртуальної пам'яті
  (насправді менше завдяки лінивому виділенню, але тиск на планувальник ОС є значним)
- **Корутини**: 640 × 4 KiB = 2.5 MiB
  (різниця у **три порядки**)

---

## 3. Проблема C10K та реальні сервери

### Проблема

У 1999 році Dan Kegel сформулював
[проблему C10K](https://www.kegel.com/c10k.html):
сервери, що використовують модель «один потік на з'єднання», не могли обслужити
10 000 одночасних з'єднань.
Причиною були не обмеження апаратного забезпечення, а накладні витрати потоків ОС.

### Рішення

Проблема була вирішена переходом до подієво-орієнтованої архітектури:
замість створення потоку для кожного з'єднання
один event loop обслуговує тисячі з'єднань в одному потоці.

Саме такий підхід реалізований у **nginx**, **Node.js**, **libuv** та — в контексті PHP — **True Async**.

### Бенчмарки: nginx (подієво-орієнтований) vs Apache (потік на запит)

| Метрика (1000 одночасних з'єднань) | nginx        | Apache                               |
|------------------------------------|--------------|--------------------------------------|
| Запитів на секунду (статика)       | 2 500–3 000  | 800–1 200                            |
| Пропускна здатність HTTP/2         | >6 000 req/s | ~826 req/s                           |
| Стабільність під навантаженням     | Стабільний   | Деградація при >150 з'єднаннях       |

nginx обслуговує у **2–4 рази** більше запитів, ніж Apache,
споживаючи при цьому значно менше пам'яті.
Apache з архітектурою потік-на-запит приймає не більше 150 одночасних з'єднань
(за замовчуванням), після чого нові клієнти чекають у черзі.

**Джерела:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — постановка проблеми
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — бенчмарки
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — індустріальний досвід

---

## 4. Академічні дослідження

### SEDA: Staged Event-Driven Architecture (Welsh et al., 2001)

Matt Welsh, David Culler та Eric Brewer з UC Berkeley запропонували
SEDA — серверну архітектуру на основі подій та черг між етапами обробки.

**Ключовий результат**: Сервер SEDA на Java перевершив
Apache (C, потік-на-з'єднання) за пропускною здатністю при 10 000+ одночасних з'єднаннях.
Apache не міг прийняти більше 150 одночасних з'єднань.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Порівняння архітектур веб-серверів (Pariag et al., 2007)

Найбільш ретельне порівняння архітектур провели Pariag et al.
з Університету Ватерлоо. Вони порівняли три сервери на одній кодовій базі:

- **µserver** — подієво-орієнтований (SYMPED, один процес)
- **Knot** — потік-на-з'єднання (бібліотека Capriccio)
- **WatPipe** — гібридний (конвеєр, подібний до SEDA)

**Ключовий результат**: Подієво-орієнтований µserver та конвеєрний WatPipe
забезпечили на **~18% вищу пропускну здатність**, ніж потоковий Knot.
WatPipe потребував 25 потоків запису для досягнення тієї ж продуктивності,
що µserver з 10 процесами.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: прискорення обробки подій за допомогою корутин (2022)

Дослідження, опубліковане на arXiv, провело пряме порівняння
корутин та потоків для потокової обробки даних (event-based processing).

**Ключовий результат**: Корутини забезпечили **щонайменше 2x пропускну здатність**
порівняно зі звичайними потоками для обробки потоку подій.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Масштабованість: 100 000 завдань

### Kotlin: 100 000 корутин за 100 мс

У бенчмарку [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
створення та запуск 100 000 корутин зайняли ~100 мс накладних витрат.
Еквівалентна кількість потоків потребувала б ~1.7 секунди лише на створення
(100 000 × 17 мкс) та ~950 MiB пам'яті для стеків.

### Rust: 250 000 async-завдань

У бенчмарку [context-switch](https://github.com/jimblandy/context-switch)
250 000 async-завдань було запущено в одному процесі,
тоді як потоки ОС досягли ліміту на ~80 000.

### Go: мільйони горутин

Go регулярно запускає сотні тисяч і мільйони горутин у production-системах.
Саме це дозволяє серверам на кшталт Caddy, Traefik та CockroachDB
обробляти десятки тисяч одночасних з'єднань.

---

## 6. Підсумок доказів

| Твердження                                          | Підтвердження                                             |
|-----------------------------------------------------|-----------------------------------------------------------|
| Перемикання корутин дешевше за потоки                | ~200 нс проти ~1500 нс — **7–8x** (Bendersky 2018, Blandy) |
| Корутини споживають менше пам'яті                    | 0.4–4 KiB проти 9.5 KiB–8 MiB — **24x+** (Blandy, Go FAQ) |
| Подієво-орієнтований сервер масштабується краще      | nginx 2–4x пропускна здатність проти Apache (бенчмарки)    |
| Подієво-орієнтований > потік-на-з'єднання (академічно) | +18% пропускна здатність (Pariag 2007), C10K вирішено (Kegel 1999) |
| Корутини > потоки для обробки подій                  | 2x пропускна здатність (AEStream 2022)                    |
| Сотні тисяч корутин в одному процесі                | 250K async-завдань (Rust), 100K корутин за 100мс (Kotlin) |
| Формула N ≈ 1 + T_io/T_cpu є правильною             | Goetz 2006, Zalando, закон Літтла                         |

---

## Джерела

### Виміри та бенчмарки
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Академічні роботи
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Індустріальний досвід
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### Дивіться також
- [Python asyncio на практиці](/uk/docs/evidence/python-evidence.html) — production-кейси (Duolingo, Super.com, Instagram), бенчмарки uvloop, контраргументи Cal Paterson
- [Swoole на практиці](/uk/docs/evidence/swoole-evidence.html) — production-кейси та бенчмарки для PHP-корутин
