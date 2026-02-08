---
layout: architecture
lang: ru
path_key: "/architecture.html"
nav_active: architecture
permalink: /ru/architecture.html
page_title: "Архитектура"
description: "Внутреннее устройство компонентов TrueAsync — пул ресурсов, PDO Pool, диаграммы и C API."
---

## Обзор

Раздел архитектуры описывает внутреннее устройство ключевых компонентов TrueAsync
на уровне C-кода: структуры данных, алгоритмы, интеграцию с Zend Engine
и взаимодействие между ядром PHP и async-расширением.

Эти материалы предназначены для разработчиков, которые хотят понять,
как работает TrueAsync «под капотом», или планируют создавать собственные
расширения с поддержкой пулов.

## Компоненты

### [Async\Pool](/ru/architecture/pool.html)

Универсальный пул ресурсов. Описаны:
- Двухуровневая структура данных (ABI в ядре + internal в расширении)
- Алгоритмы acquire/release с FIFO-очередью ожидающих корутин
- Healthcheck через периодический таймер
- Circuit Breaker с тремя состояниями
- C API для расширений (макросы `ZEND_ASYNC_POOL_*`)

### [PDO Pool](/ru/architecture/pdo-pool.html)

PDO-специфичная надстройка над `Async\Pool`. Описаны:
- Template-соединение и отложенное создание реальных соединений
- Привязка соединений к корутинам через HashTable
- Pinning при активных транзакциях и стейтментах
- Автоматический rollback и cleanup при завершении корутины
- Управление credentials в factory
