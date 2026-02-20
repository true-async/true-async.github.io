---
layout: architecture
lang: ru
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /ru/architecture/zend-async-api.html
page_title: "Zend Async API (C ABI)"
description: "Архитектура асинхронного ABI ядра PHP — function pointers, регистрация расширений, глобальное состояние и макросы ZEND_ASYNC_*."
---

# Zend Async ABI

`TrueAsync` `ABI` построен на чётком разделении **определения** и **реализации**:

| Слой            | Расположение            | Ответственность                                |
|-----------------|-------------------------|------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h` | Определение типов, структур, function pointers |
| **Расширение**  | `ext/async/`            | Реализация всех функций, регистрация через API |

Ядро `PHP` не вызывает функции расширения напрямую.
Вместо этого используются макросы `ZEND_ASYNC_*`, которые обращаются к `function pointers`,
зарегистрированным расширением при загрузке.

Такой подход преследует две цели:
1. Асинхронный движок может работать с любым количеством расширений, реализующих `ABI`
2. Макросы уменьшают зависимость от реализации и снижают рефакторинг

## Глобальное состояние

Часть глобального состояния, которое связано с асинхронностью, располагается в ядре PHP,
и так же доступно посредством макроса `ZEND_ASYNC_G(v)`, а также других специализированных, 
например `ZEND_ASYNC_CURRENT_COROUTINE`.

```c
typedef struct {
    zend_async_state_t state;           // OFF → READY → ACTIVE
    zend_atomic_bool heartbeat;         // Scheduler heartbeat flag
    bool in_scheduler_context;          // TRUE если сейчас в планировщике
    bool graceful_shutdown;             // TRUE при завершении работы
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // Текущая корутина
    zend_async_scope_t *main_scope;     // Корневой scope
    zend_coroutine_t *scheduler;        // Корутина планировщика
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### Запуск

На текущий момент `TrueAsync` не запускается сразу,
а делает это лениво в "нужный" момент времени. (Такой подход в будущем будет изменён,
так как практически любая функция ввода вывода PHP активирует `Scheduler`)

Когда `PHP` скрипт начинает работать, `TrueAsync` находится в состоянии `ZEND_ASYNC_READY`. 
При первом вызове функции, которая требует `Scheduler` с помощью макроса `ZEND_ASYNC_SCHEDULER_LAUNCH()`, 
происходит инициализация планировщика и переход в состояние `ZEND_ASYNC_ACTIVE`.

В этот момент, код, который выполнялся, оказывается в главной корутине, 
а для `Schduler` создаётся ещё одна корутина.

Кроме `ZEND_ASYNC_SCHEDULER_LAUNCH()`, которая явно активирует `Scheduler`,
`TrueAsync` так же перехватывает управление в функциях `php_execute_script_ex` и `php_request_shutdown`.

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

Этот код позволяет передать управление `Scheduler` после того, как основной поток завершит выполнение.
А `Scheduler` в свою очередь сможет запустить другие корутины, если они есть.

Данный подход обеспечивает не только 100% прозрачность TrueAsync для PHP-программиста, 
но и полную совместимость `PHP SAPI`. Клиенты, использующие `PHP SAPI` продолжают считать `PHP` синхронным, 
хотя на самом деле внутри работает `EventLoop`.

В функции `php_request_shutdown` происходит последний перехват управления, с целью выполнить корутины в деструкторах,
после чего `Scheduler` завершает работу и освобождает ресурсы.

## Регистрация расширений

Так как `TrueAsync ABI` является частью ядра `PHP`, он доступен всем `PHP` расширениям на самом раннем этапе.
Поэтому расширения имеют шанс корректно инициализировать `TrueAsync` перед тем, как `PHP Engine`
будет запущен для выполнения кода.

Расширение регистрирует свои реализации через набор `_register()` функций.
Каждая функция принимает набор function pointers и записывает их
в глобальные `extern` переменные ядра.

В зависимости от целей расширения, `allow_override` позволяет легально перерегистрировать указатели функций.
В общем случае, `TrueAsync` запрещает двум расширениям определять одинаковые группы `API`. 

`TrueAsync` разделён на несколько категорий, каждая из которых имеет свою функцию регистрации:
* `Scheduler` - API связанный с основным функционалом. Имеет большинство разных функций
* `Reactor` - API для работы с `Event loop` и событиями. Имеет функции для создания разных типов событий, а также для управления жизненным циклом реактора
* `ThreadPool` - API для управления пулом потоков и очередью задач
* `Async IO` - API для асинхронного ввода-вывода, включая работу с файловыми дескрипторами, сокетами и UDP
* `Pool` - API для управления универсальными пулами ресурсов, с поддержкой healthcheck и circuit breaker

```c
zend_async_scheduler_register(
    char *module,                    // Имя модуля
    bool allow_override,             // Разрешить перезапись
    zend_async_scheduler_launch_t,   // Запуск scheduler
    zend_async_new_coroutine_t,      // Создание корутины
    zend_async_new_scope_t,          // Создание scope
    zend_async_new_context_t,        // Создание контекста
    zend_async_spawn_t,              // Порождение корутины
    zend_async_suspend_t,            // Приостановка
    zend_async_enqueue_coroutine_t,  // Постановка в очередь
    zend_async_resume_t,             // Возобновление
    zend_async_cancel_t,             // Отмена
    // ... и другие
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // Инициализация event loop
    zend_async_reactor_shutdown_t,   // Завершение event loop
    zend_async_reactor_execute_t,    // Один тик реактора
    zend_async_reactor_loop_alive_t, // Есть ли активные события
    zend_async_new_socket_event_t,   // Создание poll-события
    zend_async_new_timer_event_t,    // Создание таймера
    zend_async_new_signal_event_t,   // Подписка на сигнал
    // ... и другие
);
```