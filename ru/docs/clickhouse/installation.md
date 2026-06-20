---
layout: docs
lang: ru
path_key: "/docs/clickhouse/installation.html"
nav_active: docs
permalink: /ru/docs/clickhouse/installation.html
page_title: "ClickHouse для TrueAsync: установка"
description: "Сборка php-clickhouse: требования, сборка встроенной статической библиотеки clickhouse-cpp, сборка и загрузка расширения."
---

# Установка php-clickhouse

## Требования

- PHP 8.x, собранный с **ZTS** и ABI **TrueAsync** (клиент рассчитан на рантайм
  TrueAsync).
- Компилятор **C++17** (его требует clickhouse-cpp).
- **CMake** ≥ 3.12 и генератор `make`/`ninja`.
- Стандартные инструменты сборки PHP-расширений (`phpize`, `php-config`).

## 1. Клонирование с сабмодулями

```sh
git clone --recurse-submodules https://github.com/true-async/php-clickhouse.git
cd php-clickhouse
# уже склонировали без сабмодулей?
git submodule update --init --recursive
```

## 2. Сборка встроенной статической библиотеки clickhouse-cpp

Расширение линкуется с предсобранной статической `clickhouse-cpp` (и её
встроенными зависимостями: cityhash, lz4, zstd, absl). Соберите её один раз через
CMake. `-DCMAKE_POSITION_INDEPENDENT_CODE=ON` обязателен, чтобы архивы
слинковались в разделяемый объект PHP.

```sh
cmake -S third_party/clickhouse-cpp -B third_party/clickhouse-cpp/build \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
  -DCH_MAP_BOOL_TO_UINT8=OFF \
  -DWITH_OPENSSL=OFF \
  -DBUILD_TESTS=OFF \
  -DBUILD_BENCHMARK=OFF
cmake --build third_party/clickhouse-cpp/build -j"$(nproc)"
```

> `-DCH_MAP_BOOL_TO_UINT8=OFF` выделяет ClickHouse `Bool` в отдельный тип, чтобы
> клиент мог возвращать PHP `bool` (иначе `Bool` сводится к `UInt8`/int).
>
> TLS обеспечивается слоем потоков PHP (`ssl://`), а не собственным
> OpenSSL-сокетом clickhouse-cpp, поэтому `-DWITH_OPENSSL=OFF` — это нормально.

## 3. Сборка расширения

```sh
phpize
./configure --enable-clickhouse-async
make -j"$(nproc)"
```

`configure` сразу падает с понятным сообщением, если шаг 2 был пропущен.

## 4. Загрузка

```sh
php -d extension=$(pwd)/modules/clickhouse_async.so --ri true_async_clickhouse
```
