---
layout: docs
lang: ru
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /ru/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio на практике: Duolingo, Super.com, Instagram, бенчмарки uvloop, контр-аргументы."
---

# Python asyncio на практике: реальные замеры

Python — язык, наиболее близкий к PHP по модели исполнения:
интерпретируемый, однопоточный (GIL), с доминированием синхронных фреймворков.
Переход с синхронного Python (Flask, Django + Gunicorn) на асинхронный
(FastAPI, aiohttp, Starlette + Uvicorn) — это точный аналог перехода
с PHP-FPM на корутинный рантайм.

Ниже собраны production-кейсы, независимые бенчмарки и измерения.

---

## 1. Production: Duolingo — миграция на async Python (+40% throughput)

[Duolingo](https://blog.duolingo.com/async-python-migration/) — крупнейшая
платформа для изучения языков (500M+ пользователей).
Бэкенд написан на Python.

В 2025 году команда начала системную миграцию сервисов с синхронного
Python на async.

| Метрика               | Результат                               |
|-----------------------|-----------------------------------------|
| Throughput на инстанс | **+40%**                                |
| Экономия на AWS EC2   | **~30%** на каждый мигрированный сервис |

Авторы отмечают, что после создания async-инфраструктуры миграция
отдельных сервисов оказалась «достаточно простой» (fairly straightforward).

**Источник:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Production: Super.com — снижение затрат на 90%

[Super.com](https://www.super.com/) (ранее Snaptravel) — сервис поиска
отелей и скидок. Их поисковый движок обрабатывает 1 000+ req/s,
принимает 1 TB+ данных в день и обрабатывает $1M+ продаж ежедневно.

**Ключевая характеристика нагрузки:** каждый запрос делает **40+ сетевых вызовов**
к сторонним API. Это чистый I/O-bound профиль — идеальный кандидат для корутин.

Команда мигрировала с Flask (синхронный, AWS Lambda) на Quart (ASGI, EC2).

| Метрика                  | Flask (Lambda) | Quart (ASGI) | Изменение      |
|--------------------------|----------------|--------------|----------------|
| Инфраструктурные затраты | ~$1 000/день   | ~$50/день    | **−90%**       |
| Throughput               | ~150 req/s     | 300+ req/s   | **2x**         |
| Ошибки в пиковые часы    | Baseline       | −95%         | **−95%**       |
| Латентность              | Baseline       | −50%         | **2x быстрее** |

Экономия $950/день × 365 = **~$350 000/год** на одном сервисе.

**Источник:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Production: Instagram — asyncio на масштабе 500M DAU

Instagram обслуживает 500+ миллионов активных
пользователей ежедневно на Django-бэкенде.

Джимми Лай (инженер Instagram) описал миграцию на asyncio в докладе
на PyCon Taiwan 2018:

- Заменили `requests` на `aiohttp` для HTTP-вызовов
- Перевели внутренний RPC на `asyncio`
- Получили улучшение производительности API и снижение простоя CPU

**Вызовы:** высокий CPU-overhead asyncio на масштабе Instagram,
необходимость автоматизированного поиска блокирующих вызовов через
статический анализ кода.

**Источник:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Production: Feature Store — с потоков на asyncio (−40% латентности)

Сервис Feature Store мигрировал с Python multithreading на asyncio.

| Метрика         | Потоки                | Asyncio            | Изменение             |
|-----------------|-----------------------|--------------------|-----------------------|
| Латентность     | Baseline              | −40%               | **−40%**              |
| Потребление RAM | 18 GB (сотни потоков) | Значительно меньше | Существенное снижение |

Миграция проведена в три фазы с 50/50 разделением production-трафика
для валидации.

**Источник:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Production: Talk Python — Flask → Quart (−81% латентности)

[Talk Python](https://talkpython.fm/) — один из крупнейших Python-подкастов
и обучающих платформ. Автор (Michael Kennedy) переписал сайт
с Flask (синхронный) на Quart (асинхронный Flask).

| Метрика               | Flask | Quart | Изменение   |
|-----------------------|-------|-------|-------------|
| Время ответа (пример) | 42 ms | 8 ms  | **−81%**    |
| Баги после миграции   | —     | 2     | Минимальные |

Автор отмечает: при нагрузочном тестировании максимальный req/s
отличался незначительно, потому что MongoDB-запросы занимали <1 ms.
Выигрыш проявляется при **конкурентной** обработке запросов —
когда несколько клиентов обращаются одновременно.

**Источник:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop как стандарт

Microsoft включил [uvloop](https://github.com/MagicStack/uvloop) —
быстрый event loop на libuv — в качестве стандартного для Azure Functions
на Python 3.13+.

| Тест                           | Стандартный asyncio | uvloop      | Улучшение |
|--------------------------------|---------------------|-------------|-----------|
| 10K запросов, 50 VU (локально) | 515 req/s           | 565 req/s   | **+10%**  |
| 5 мин, 100 VU (Azure)          | 1 898 req/s         | 1 961 req/s | **+3%**   |
| 500 VU (локально)              | 720 req/s           | 772 req/s   | **+7%**   |

Стандартный event loop при 500 VU показал **~2% потерь запросов**.
uvloop — ноль ошибок.

**Источник:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Бенчмарк: I/O-bound задачи — asyncio в 130 раз быстрее

Прямое сравнение моделей конкурентности на задаче загрузки 10 000 URL:

| Модель       | Время    | Throughput     | Ошибки    |
|--------------|----------|----------------|-----------|
| Синхронная   | ~1 800 с | ~11 KB/s       | —         |
| Потоки (100) | ~85 с    | ~238 KB/s      | Низкий    |
| **Asyncio**  | **14 с** | **1 435 KB/s** | **0.06%** |

Asyncio: **130x быстрее** синхронного кода, **6x быстрее** потоков.

На CPU-bound задачах asyncio не даёт никакого преимущества
(идентичное время, +44% потребления памяти).

**Источник:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Бенчмарк: uvloop — быстрее Go и Node.js

[uvloop](https://github.com/MagicStack/uvloop) — drop-in замена стандартного
asyncio event loop, написанная на Cython поверх libuv (та же библиотека,
что лежит в основе Node.js).

TCP echo-сервер:

| Реализация          | 1 KiB (req/s) | 100 KiB throughput |
|---------------------|---------------|--------------------|
| **uvloop**          | **105 459**   | **2.3 GiB/s**      |
| Go                  | 103 264       | —                  |
| Стандартный asyncio | 41 420        | —                  |
| Node.js             | 44 055        | —                  |

HTTP-сервер (300 concurrent):

| Реализация             | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37 866**    |
| Node.js                | Ниже          |

uvloop: **2.5x быстрее** стандартного asyncio, **2x быстрее** Node.js,
**на уровне Go**.

**Источник:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Бенчмарк: aiohttp vs requests — 10x на конкурентных запросах

| Библиотека    | req/s (конкурентно) | Тип   |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp: **10x быстрее** Requests при конкурентных HTTP-запросах.

**Источник:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Контр-аргумент: Cal Paterson — «Async Python не быстрее»

Важно привести и контр-аргументы. Cal Paterson провёл тщательный бенчмарк
с **реальной базой данных** (PostgreSQL, случайная выборка строки + JSON):

| Фреймворк                  | Тип   | req/s     | P99 латентность |
|----------------------------|-------|-----------|-----------------|
| Gunicorn + Meinheld/Bottle | Sync  | **5 780** | **32 ms**       |
| Gunicorn + Meinheld/Falcon | Sync  | **5 589** | **31 ms**       |
| Uvicorn + Starlette        | Async | 4 952     | 75 ms           |
| Sanic                      | Async | 4 687     | 85 ms           |
| AIOHTTP                    | Async | 4 501     | 76 ms           |

**Результат:** синхронные фреймворки с C-серверами показали **выше throughput**
и **в 2–3 раза лучше tail latency** (P99).

### Почему async проиграл?

Причины:

1. **Одиночный SQL-запрос** на HTTP-запрос — слишком мало I/O,
   чтобы корутинная конкурентность дала эффект.
2. **Кооперативная многозадачность** при CPU-работе между запросами
   создаёт «несправедливое» распределение CPU-времени —
   длинные вычисления блокируют event loop для всех.
3. **Overhead asyncio** (стандартный event loop на Python)
   сопоставим с выигрышем от неблокирующего I/O при малом I/O.

### Когда async действительно помогает

Бенчмарк Paterson'а тестирует **простейший сценарий** (1 SQL-запрос).
Как показывают production-кейсы выше, async даёт радикальный выигрыш когда:

- Запросов к БД / внешним API **много** (Super.com: 40+ вызовов на запрос)
- Конкурентность **высокая** (тысячи одновременных соединений)
- I/O **доминирует** над CPU (Duolingo, Appwrite)

Это совпадает с теорией:
чем выше blocking coefficient (T_io/T_cpu), тем больше выигрыш от корутин.
При 1 SQL-запросе × 2 ms коэффициент слишком мал.

**Источник:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: Python-фреймворки

Приблизительные результаты из [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Фреймворк         | Тип        | req/s (JSON)          |
|-------------------|------------|-----------------------|
| Uvicorn (raw)     | Async ASGI | Максимум среди Python |
| Starlette         | Async ASGI | ~20 000–25 000        |
| FastAPI           | Async ASGI | ~15 000–22 000        |
| Flask (Gunicorn)  | Sync WSGI  | ~4 000–6 000          |
| Django (Gunicorn) | Sync WSGI  | ~2 000–4 000          |

Async-фреймворки: **3–5x** быстрее синхронных в JSON-тесте.

**Источник:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Сводка: что показывают данные Python

| Кейс                       | Sync → Async                            | Условие                               |
|----------------------------|-----------------------------------------|---------------------------------------|
| Duolingo (production)      | **+40%** throughput, **−30%** стоимость | Микросервисы, I/O                     |
| Super.com (production)     | **2x** throughput, **−90%** стоимость   | 40+ API-вызовов на запрос             |
| Feature Store (production) | **−40%** латентности                    | Миграция с потоков на asyncio         |
| Talk Python (production)   | **−81%** латентности                    | Flask → Quart                         |
| I/O-bound (10K URLs)       | **130x** быстрее                        | Чистый I/O, массовая конкурентность   |
| aiohttp vs requests        | **10x** быстрее                         | Конкурентные HTTP-запросы             |
| uvloop vs стандартный      | **2.5x** быстрее                        | TCP echo, HTTP                        |
| TechEmpower JSON           | **3–5x**                                | FastAPI/Starlette vs Flask/Django     |
| **Простой CRUD (1 SQL)**   | **Sync быстрее**                        | Cal Paterson: P99 в 2–3x хуже у async |
| **CPU-bound**              | **Нет разницы**                         | +44% памяти, 0% выигрыша              |

### Ключевой вывод

Async Python даёт максимальный выигрыш при **высоком blocking coefficient**:
когда время I/O значительно превышает время CPU.
При 40+ сетевых вызовах (Super.com) — экономия 90%.
При 1 SQL-запросе (Cal Paterson) — async медленнее.

Это **подтверждает формулу** из [Эффективность IO-bound задач](/ru/docs/evidence/concurrency-efficiency.html):
выигрыш ≈ 1 + T_io/T_cpu. При T_io >> T_cpu — десятки и сотни раз.
При T_io ≈ T_cpu — минимальный или нулевой.

---

## Связь с PHP и True Async

Python и PHP находятся в похожей ситуации:

| Характеристика       | Python               | PHP                 |
|----------------------|----------------------|---------------------|
| Интерпретируемый     | Да                   | Да                  |
| GIL / однопоточность | GIL                  | Однопоточный        |
| Доминирующая модель  | Sync (Django, Flask) | Sync (FPM)          |
| Async-рантайм        | asyncio + uvloop     | Swoole / True Async |
| Async-фреймворк      | FastAPI, Starlette   | Hyperf              |

Данные Python показывают, что переход на корутины в однопоточном
интерпретируемом языке — **работает**. Масштаб выигрыша
определяется профилем нагрузки, а не языком.

---

## Ссылки

### Production-кейсы
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Бенчмарки
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Корутины vs потоки
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
