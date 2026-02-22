---
layout: architecture
lang: uk
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /uk/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "Архітектура асинхронного ABI ядра PHP -- вказівники на функції, реєстрація розширень, глобальний стан та макроси ZEND_ASYNC_*."
---

# TrueAsync ABI

`TrueAsync` `ABI` побудований на чіткому розділенні **визначення** та **реалізації**:

| Шар             | Розташування              | Відповідальність                                   |
|-----------------|---------------------------|----------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h`   | Визначення типів, структур, вказівників на функції  |
| **Розширення**  | `ext/async/`              | Реалізація всіх функцій, реєстрація через API      |

Ядро `PHP` не викликає функції розширення напряму.
Натомість воно використовує макроси `ZEND_ASYNC_*`, що викликають `вказівники на функції`,
зареєстровані розширенням під час завантаження.

Цей підхід переслідує дві цілі:
1. Асинхронний рушій може працювати з будь-якою кількістю розширень, що реалізують `ABI`
2. Макроси зменшують залежність від деталей реалізації та мінімізують рефакторинг

## Глобальний стан

Частина глобального стану, пов'язана з асинхронністю, знаходиться в ядрі PHP
і також доступна через макрос `ZEND_ASYNC_G(v)`, а також інші спеціалізовані макроси,
наприклад `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // Прапорець серцебиття scheduler
    bool in_scheduler_context;          // TRUE, якщо зараз в контексті scheduler
    bool graceful_shutdown;             // TRUE під час завершення
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Поточна корутина
    zend_async_scope_t *main_scope;     // Кореневий scope
    zend_coroutine_t *scheduler;        // Корутина scheduler
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Запуск

Наразі `TrueAsync` запускається не одразу, а ліниво у "правильний" момент.
(Цей підхід зміниться в майбутньому, оскільки практично будь-яка PHP I/O-функція активує `Scheduler`.)

Коли `PHP`-скрипт починає виконання, `TrueAsync` перебуває в стані `ZEND_ASYNC_READY`.
При першому виклику функції, що потребує `Scheduler`, через макрос `ZEND_ASYNC_SCHEDULER_LAUNCH()`,
scheduler ініціалізується і переходить у стан `ZEND_ASYNC_ACTIVE`.

В цей момент код, що виконувався, опиняється в головній корутині,
а для `Scheduler` створюється окрема корутина.

Окрім `ZEND_ASYNC_SCHEDULER_LAUNCH()`, що явно активує `Scheduler`,
`TrueAsync` також перехоплює управління у функціях `php_execute_script_ex` та `php_request_shutdown`.

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

Цей код дозволяє передати управління `Scheduler` після завершення виконання головного потоку.
`Scheduler`, у свою чергу, може запустити інші корутини, якщо такі є.

Цей підхід забезпечує не лише 100% прозорість TrueAsync для PHP-програміста,
а й повну сумісність із `PHP SAPI`. Клієнти, що використовують `PHP SAPI`, продовжують сприймати `PHP` як синхронний,
навіть якщо всередині працює `EventLoop`.

У функції `php_request_shutdown` відбувається фінальне перехоплення для виконання корутин у деструкторах,
після чого `Scheduler` завершує роботу і звільняє ресурси.

## Реєстрація розширень

Оскільки `TrueAsync ABI` є частиною ядра `PHP`, він доступний усім `PHP`-розширенням на найранішому етапі.
Тому розширення мають можливість правильно ініціалізувати `TrueAsync` до того, як `PHP Engine`
буде запущений для виконання коду.

Розширення реєструє свої реалізації через набір функцій `_register()`.
Кожна функція приймає набір вказівників на функції і записує їх
до глобальних `extern`-змінних ядра.

Залежно від цілей розширення, `allow_override` дозволяє легально перереєструвати вказівники на функції.
За замовчуванням `TrueAsync` забороняє двом розширенням визначати одні й ті самі `API`-групи.

`TrueAsync` поділяється на декілька категорій, кожна з власною функцією реєстрації:
* `Scheduler` -- API, пов'язаний з основною функціональністю. Містить більшість різноманітних функцій
* `Reactor` -- API для роботи з `Event loop` та подіями. Містить функції для створення різних типів подій та управління життєвим циклом реактора
* `ThreadPool` -- API для управління пулом потоків та чергою завдань
* `Async IO` -- API для асинхронного введення/виведення, включаючи файлові дескриптори, сокети та UDP
* `Pool` -- API для управління універсальними пулами ресурсів з підтримкою healthcheck та circuit breaker

```c
zend_async_scheduler_register(
    char *module,                    // Ім'я модуля
    bool allow_override,             // Дозволити перезапис
    zend_async_scheduler_launch_t,   // Запуск scheduler
    zend_async_new_coroutine_t,      // Створення корутини
    zend_async_new_scope_t,          // Створення scope
    zend_async_new_context_t,        // Створення контексту
    zend_async_spawn_t,              // Запуск корутини
    zend_async_suspend_t,            // Призупинення
    zend_async_enqueue_coroutine_t,  // Додавання в чергу
    zend_async_resume_t,             // Відновлення
    zend_async_cancel_t,             // Скасування
    // ... та інші
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Ініціалізація event loop
    zend_async_reactor_shutdown_t,   // Завершення event loop
    zend_async_reactor_execute_t,    // Один тік реактора
    zend_async_reactor_loop_alive_t, // Чи є активні події
    zend_async_new_socket_event_t,   // Створення poll-події
    zend_async_new_timer_event_t,    // Створення таймера
    zend_async_new_signal_event_t,   // Підписка на сигнал
    // ... та інші
);
```
