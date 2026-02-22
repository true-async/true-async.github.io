---
layout: docs
lang: uk
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /uk/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio на практиці: Duolingo, Super.com, Instagram, бенчмарки uvloop, контраргументи."
---

# Python asyncio на практиці: реальні вимірювання

Python — мова, найбільш схожа на PHP за моделлю виконання:
інтерпретована, однопотокова (GIL), з домінуванням синхронних фреймворків.
Перехід від синхронного Python (Flask, Django + Gunicorn) до асинхронного
(FastAPI, aiohttp, Starlette + Uvicorn) — це точна аналогія переходу
від PHP-FPM до корутинного середовища виконання.

Нижче наведено збірку продакшн-кейсів, незалежних бенчмарків та вимірювань.

---

## 1. Продакшн: Duolingo — міграція на Async Python (+40% пропускної здатності)

[Duolingo](https://blog.duolingo.com/async-python-migration/) — найбільша
платформа для вивчення мов (500M+ користувачів).
Бекенд написаний на Python.

У 2025 році команда розпочала систематичну міграцію сервісів із синхронного
Python на асинхронний.

| Метрика                    | Результат                               |
|----------------------------|-----------------------------------------|
| Пропускна здатність на інстанс | **+40%**                           |
| Економія на AWS EC2        | **~30%** на мігрований сервіс           |

Автори зазначають, що після побудови асинхронної інфраструктури міграція
окремих сервісів виявилася «досить простою».

**Джерело:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Продакшн: Super.com — зниження витрат на 90%

[Super.com](https://www.super.com/) (раніше Snaptravel) — сервіс пошуку
готелів та знижок. Їхній пошуковий рушій обробляє 1 000+ req/s,
приймає 1 ТБ+ даних на день та обробляє $1M+ продажів щодня.

**Ключова характеристика навантаження:** кожен запит виконує **40+ мережевих викликів**
до сторонніх API. Це чистий I/O-bound профіль — ідеальний кандидат для корутин.

Команда мігрувала з Flask (синхронний, AWS Lambda) на Quart (ASGI, EC2).

| Метрика                    | Flask (Lambda) | Quart (ASGI)  | Зміна          |
|----------------------------|----------------|---------------|----------------|
| Витрати на інфраструктуру  | ~$1,000/день   | ~$50/день     | **−90%**       |
| Пропускна здатність        | ~150 req/s     | 300+ req/s    | **2x**         |
| Помилки у пікові години    | Базовий рівень | −95%          | **−95%**       |
| Затримка                   | Базовий рівень | −50%          | **2x швидше**  |

Економія $950/день × 365 = **~$350 000/рік** на одному сервісі.

**Джерело:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Продакшн: Instagram — asyncio на масштабі 500M DAU

Instagram обслуговує 500+ мільйонів щоденних активних користувачів
на бекенді Django.

Jimmy Lai (інженер Instagram) описав міграцію на asyncio у доповіді
на PyCon Taiwan 2018:

- Замінили `requests` на `aiohttp` для HTTP-викликів
- Мігрували внутрішній RPC на `asyncio`
- Досягли покращення продуктивності API та зменшення простою CPU

**Виклики:** високе навантаження asyncio на CPU на масштабі Instagram,
необхідність автоматизованого виявлення блокуючих викликів через
статичний аналіз коду.

**Джерело:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Продакшн: Feature Store — від потоків до asyncio (−40% затримки)

Сервіс Feature Store мігрував з багатопоточності Python на asyncio.

| Метрика           | Потоки                    | Asyncio              | Зміна                     |
|-------------------|---------------------------|----------------------|---------------------------|
| Затримка          | Базовий рівень            | −40%                 | **−40%**                  |
| Споживання RAM    | 18 ГБ (сотні потоків)     | Значно менше         | Суттєве зменшення         |

Міграція виконувалася у три фази з розподілом продакшн-трафіку 50/50
для валідації.

**Джерело:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Продакшн: Talk Python — Flask до Quart (−81% затримки)

[Talk Python](https://talkpython.fm/) — один з найбільших подкастів
та навчальних платформ Python. Автор (Michael Kennedy) переписав сайт
з Flask (синхронний) на Quart (асинхронний Flask).

| Метрика                 | Flask | Quart | Зміна       |
|-------------------------|-------|-------|-------------|
| Час відповіді (приклад) | 42 мс | 8 мс | **−81%**    |
| Помилки після міграції  | —     | 2     | Мінімально  |

Автор зазначає: під час навантажувального тестування максимальний req/s
відрізнявся несуттєво, оскільки запити до MongoDB займали <1 мс.
Виграш проявляється при **одночасній** обробці запитів —
коли кілька клієнтів звертаються до сервера одночасно.

**Джерело:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop як стандарт

Microsoft включив [uvloop](https://github.com/MagicStack/uvloop) —
швидкий цикл подій на базі libuv — як стандартний для Azure Functions
на Python 3.13+.

| Тест                           | Стандартний asyncio | uvloop      | Покращення  |
|--------------------------------|---------------------|-------------|-------------|
| 10K запитів, 50 VU (локально)  | 515 req/s           | 565 req/s   | **+10%**    |
| 5 хв, 100 VU (Azure)          | 1 898 req/s         | 1 961 req/s | **+3%**     |
| 500 VU (локально)              | 720 req/s           | 772 req/s   | **+7%**     |

Стандартний цикл подій при 500 VU показав **~2% втрат запитів**.
uvloop — нуль помилок.

**Джерело:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Бенчмарк: I/O-bound задачі — asyncio у 130 разів швидше

Пряме порівняння моделей конкурентності на задачі завантаження 10 000 URL:

| Модель       | Час      | Пропускна здатність | Помилки   |
|--------------|----------|---------------------|-----------|
| Синхронна    | ~1 800 с | ~11 КБ/с            | —         |
| Потоки (100) | ~85 с    | ~238 КБ/с           | Низький   |
| **Asyncio**  | **14 с** | **1 435 КБ/с**      | **0,06%** |

Asyncio: **у 130 разів швидше** за синхронний код, **у 6 разів швидше** за потоки.

Для CPU-bound задач asyncio не дає переваг
(ідентичний час, +44% споживання пам'яті).

**Джерело:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Бенчмарк: uvloop — швидше за Go та Node.js

[uvloop](https://github.com/MagicStack/uvloop) — це заміна стандартного
циклу подій asyncio, написана на Cython поверх libuv (тієї ж бібліотеки,
що лежить в основі Node.js).

TCP echo-сервер:

| Реалізація          | 1 KiB (req/s) | 100 KiB пропускна здатність |
|---------------------|---------------|-----------------------------|
| **uvloop**          | **105 459**   | **2,3 ГіБ/с**              |
| Go                  | 103 264       | —                           |
| Стандартний asyncio  | 41 420        | —                           |
| Node.js             | 44 055        | —                           |

HTTP-сервер (300 одночасних підключень):

| Реалізація             | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37 866**    |
| Node.js                | Нижче         |

uvloop: **у 2,5 рази швидше** за стандартний asyncio, **у 2 рази швидше** за Node.js,
**на рівні з Go**.

**Джерело:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Бенчмарк: aiohttp проти requests — 10x на одночасних запитах

| Бібліотека    | req/s (одночасних) | Тип   |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp: **у 10 разів швидше** за Requests для одночасних HTTP-запитів.

**Джерело:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Контраргумент: Cal Paterson — «Async Python не швидший»

Важливо навести й контраргументи. Cal Paterson провів ретельний бенчмарк
з **реальною базою даних** (PostgreSQL, випадковий вибір рядка + JSON):

| Фреймворк                    | Тип   | req/s     | P99 затримка |
|-------------------------------|-------|-----------|--------------|
| Gunicorn + Meinheld/Bottle    | Sync  | **5 780** | **32 мс**    |
| Gunicorn + Meinheld/Falcon    | Sync  | **5 589** | **31 мс**    |
| Uvicorn + Starlette           | Async | 4 952     | 75 мс        |
| Sanic                         | Async | 4 687     | 85 мс        |
| AIOHTTP                       | Async | 4 501     | 76 мс        |

**Результат:** синхронні фреймворки з C-серверами показали **вищу пропускну здатність**
та **у 2–3 рази кращу хвостову затримку** (P99).

### Чому async програв?

Причини:

1. **Один SQL-запит** на HTTP-запит — занадто мало I/O,
   щоб конкурентність корутин мала ефект.
2. **Кооперативна багатозадачність** із CPU-роботою між запитами
   створює «нечесний» розподіл процесорного часу —
   довгі обчислення блокують цикл подій для всіх.
3. **Накладні витрати asyncio** (стандартний цикл подій у Python)
   порівнянні з виграшем від неблокуючого I/O, коли I/O мінімальний.

### Коли async справді допомагає

Бенчмарк Paterson тестує **найпростіший сценарій** (1 SQL-запит).
Як демонструють продакшн-кейси вище, async дає драматичний виграш, коли:

- Є **багато** запитів до БД / зовнішніх API (Super.com: 40+ викликів на запит)
- Конкурентність **висока** (тисячі одночасних з'єднань)
- I/O **домінує** над CPU (Duolingo, Appwrite)

Це узгоджується з теорією:
чим вищий коефіцієнт блокування (T_io/T_cpu), тим більший виграш від корутин.
При 1 SQL-запиті × 2 мс коефіцієнт занадто низький.

**Джерело:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: фреймворки Python

Приблизні результати з [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Фреймворк         | Тип        | req/s (JSON)            |
|--------------------|------------|-------------------------|
| Uvicorn (raw)      | Async ASGI | Найвищий серед Python   |
| Starlette          | Async ASGI | ~20 000–25 000          |
| FastAPI            | Async ASGI | ~15 000–22 000          |
| Flask (Gunicorn)   | Sync WSGI  | ~4 000–6 000            |
| Django (Gunicorn)  | Sync WSGI  | ~2 000–4 000            |

Асинхронні фреймворки: **у 3–5 разів** швидше за синхронні у JSON-тесті.

**Джерело:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Підсумок: що показують дані Python

| Кейс                       | Sync → Async                           | Умова                                  |
|----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (продакшн)        | **+40%** пропускної здатності, **−30%** витрат | Мікросервіси, I/O                |
| Super.com (продакшн)       | **2x** пропускної здатності, **−90%** витрат | 40+ API-викликів на запит          |
| Feature Store (продакшн)   | **−40%** затримки                      | Міграція з потоків на asyncio          |
| Talk Python (продакшн)     | **−81%** затримки                      | Flask → Quart                          |
| I/O-bound (10K URL)        | **130x** швидше                        | Чистий I/O, масова конкурентність      |
| aiohttp проти requests     | **10x** швидше                         | Одночасні HTTP-запити                  |
| uvloop проти стандартного   | **2,5x** швидше                        | TCP echo, HTTP                         |
| TechEmpower JSON           | **3–5x**                               | FastAPI/Starlette проти Flask/Django   |
| **Простий CRUD (1 SQL)**   | **Sync швидше**                        | Cal Paterson: P99 у 2–3 рази гірше для async |
| **CPU-bound**              | **Без різниці**                        | +44% пам'яті, 0% виграшу              |

### Ключовий висновок

Async Python дає максимальну користь при **високому коефіцієнті блокування**:
коли час I/O значно перевищує час CPU.
При 40+ мережевих викликах (Super.com) — 90% економії витрат.
При 1 SQL-запиті (Cal Paterson) — async повільніше.

Це **підтверджує формулу** з [Ефективність IO-bound задач](/uk/docs/evidence/concurrency-efficiency.html):
виграш ≈ 1 + T_io/T_cpu. Коли T_io >> T_cpu — десятки та сотні разів.
Коли T_io ≈ T_cpu — мінімальний або нульовий.

---

## Зв'язок з PHP та True Async

Python та PHP перебувають у схожій ситуації:

| Характеристика           | Python               | PHP                 |
|--------------------------|----------------------|---------------------|
| Інтерпретована           | Так                  | Так                 |
| GIL / однопотокова       | GIL                  | Однопотокова        |
| Домінуюча модель         | Sync (Django, Flask) | Sync (FPM)          |
| Асинхронне середовище    | asyncio + uvloop     | Swoole / True Async |
| Асинхронний фреймворк    | FastAPI, Starlette   | Hyperf              |

Дані Python показують, що перехід на корутини в однопотоковій
інтерпретованій мові **працює**. Масштаб виграшу
визначається профілем навантаження, а не мовою.

---

## Посилання

### Продакшн-кейси
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

### Корутини проти потоків
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
