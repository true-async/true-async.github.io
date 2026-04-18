---
layout: docs
lang: ru
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /ru/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — пул воркер-потоков для параллельного выполнения CPU-нагрузки в TrueAsync."
---

# Async\ThreadPool: пул воркер-потоков

## Зачем нужен ThreadPool

[`spawn_thread()`](/ru/docs/reference/spawn-thread.html) решает задачу «одна задача — один поток»:
запустили тяжёлое вычисление, дождались результата, поток завершился. Это удобно, но у подхода есть
цена: **каждый запуск потока — полноценный системный вызов**. Инициализация отдельного PHP-окружения,
загрузка Opcache-байткода, выделение стека — всё это выполняется заново. Если таких задач сотни или
тысячи, накладные расходы становятся заметными.

`Async\ThreadPool` решает эту проблему: при старте создаётся фиксированный набор **воркер-потоков**
(OS-потоков с собственным PHP-окружением), которые живут на протяжении всей работы программы и
**многократно переиспользуются** для выполнения задач. Каждый `submit()` кладёт задачу в очередь,
свободный воркер её забирает, выполняет и возвращает результат через [`Async\Future`](/ru/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Отправить 8 задач в пул из 4 воркеров
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

Восемь задач выполняются параллельно на четырёх воркерах. Пока воркеры считают — основная программа
(остальные корутины) продолжают работу: `await($f)` приостанавливает только ожидающую корутину, а
не весь процесс.

## Когда использовать ThreadPool, а когда spawn_thread или корутины

| Сценарий                                             | Инструмент               |
|------------------------------------------------------|--------------------------|
| Одна тяжёлая задача, запускается редко               | `spawn_thread()`         |
| Много коротких CPU-задач в цикле                     | `ThreadPool`             |
| Фиксированный поток, живущий всё время программы     | `ThreadPool`             |
| I/O: сеть, база данных, файловая система             | Корутины                 |
| Задача нужна прямо сейчас, без очереди               | `spawn_thread()`         |

**Ключевое правило:** если задач много и они короткие — пул амортизирует стоимость запуска
потоков. Если задача одна и запускается раз в несколько секунд — достаточно `spawn_thread()`.

Типичный размер пула — число физических CPU-ядер (`nproc` на Linux, `sysconf(_SC_NPROCESSORS_ONLN)`
в C). Больше воркеров, чем ядер, не ускоряет CPU-bound нагрузку и только добавляет расходы
на переключение контекста.

## Создание пула

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Параметр    | Тип   | Назначение                                                          | По умолчанию      |
|-------------|-------|---------------------------------------------------------------------|-------------------|
| `$workers`  | `int` | Число воркер-потоков. Все стартуют при создании пула                | **обязательный**  |
| `$queueSize`| `int` | Максимальная длина очереди ожидающих задач                          | `workers × 4`     |

Все воркер-потоки запускаются **сразу при создании** пула — `new ThreadPool(4)` создаёт четыре
потока немедленно. Это небольшое «авансовое» вложение, зато последующие `submit()` не несут
накладных расходов на запуск потока.

`$queueSize` ограничивает размер внутренней очереди задач. Если очередь заполнена (все воркеры заняты
и в очереди уже `$queueSize` задач), следующий `submit()` **приостанавливает вызывающую корутину**
до тех пор, пока воркер не освободится. Нулевое значение означает `workers × 4`.

## Отправка задач

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Добавляет задачу в очередь пула. Возвращает [`Async\Future`](/ru/docs/components/future.html),
который:

- **разрешается** (`resolve`) значением `return` из `$task`, когда воркер завершает выполнение;
- **отклоняется** (`reject`) исключением, если `$task` выбросил исключение.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Задача без аргументов
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Задача с аргументами — аргументы тоже передаются по значению (глубокое копирование)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### Обработка исключений из задачи

Если задача выбрасывает исключение, `Future` отклоняется, и `await()` перебрасывает его в
вызывающей корутине:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('что-то пошло не так в воркере');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Поймано: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Поймано: что-то пошло не так в воркере
```

#### Правила передачи данных

Задача (`$task`) и все `...$args` **глубоко копируются** в воркер-поток — те же правила, что и при
`spawn_thread()`. Нельзя передавать `stdClass`, PHP-ссылки (`&$var`) и ресурсы; при попытке
источник выбросит `Async\ThreadTransferException`. Подробнее:
[«Передача данных между потоками»](/ru/docs/components/threads.html#передача-данных-между-потоками).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Применяет `$task` к каждому элементу `$items` параллельно, используя воркеры пула. **Блокирует**
вызывающую корутину до завершения всех задач. Возвращает массив результатов в том же порядке,
что и входные данные.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

Если хотя бы одна задача выбрасывает исключение, `map()` перебрасывает его в вызывающей корутине.
Порядок результата всегда соответствует порядку входных элементов, независимо от порядка завершения
воркеров.

## Мониторинг состояния пула

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Запустить несколько задач
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Имитация работы
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Проверить счётчики, пока задачи выполняются
    delay(50); // дать воркерам время стартовать
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| Метод                 | Что возвращает                                                                      |
|-----------------------|-------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Число воркер-потоков (задано в конструкторе)                                        |
| `getPendingCount()`   | Задачи в очереди, ещё не взятые воркером                                            |
| `getRunningCount()`   | Задачи, которые прямо сейчас выполняются воркером                                   |
| `getCompletedCount()` | Суммарно завершённых задач с момента создания пула (монотонно возрастает)           |
| `isClosed()`          | `true`, если пул закрыт через `close()` или `cancel()`                              |

Счётчики реализованы как атомарные переменные — они актуальны в любой момент, даже когда воркеры
работают в параллельных потоках.

## Завершение работы пула

Воркер-потоки живут до тех пор, пока пул не будет явно остановлен. Всегда вызывайте `close()`
или `cancel()` по завершении работы — иначе потоки продолжат работать до конца процесса.

### close() — мягкая остановка

```php
$pool->close();
```

После вызова `close()`:

- Новые `submit()` немедленно выбрасывают `Async\ThreadPoolException`.
- Задачи, уже находящиеся в очереди или выполняющиеся у воркеров, **завершаются в штатном режиме**.
- Метод возвращается только после того, как все задачи в работе закончились и все воркеры остановились.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // Гарантированно получим результат

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Ошибка: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Ошибка: Cannot submit task: thread pool is closed
```

### cancel() — жёсткая остановка

```php
$pool->cancel();
```

После вызова `cancel()`:

- Новые `submit()` выбрасывают `Async\ThreadPoolException`.
- Задачи в очереди (ещё не взятые воркером) **немедленно отклоняются** — соответствующие `Future`
  переходят в статус «отклонён».
- Задачи, уже выполняющиеся у воркеров, **дорабатывают до конца** текущей итерации (принудительно
  прерывать PHP-код внутри потока нельзя).
- Воркеры останавливаются сразу после завершения текущей задачи, не берут новых.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Заполнить очередь задачами
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Немедленно отменить — задачи в очереди будут отклонены
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### Сравнение close() и cancel()

| Аспект                            | `close()`                          | `cancel()`                          |
|-----------------------------------|------------------------------------|-------------------------------------|
| Новые submit()                    | Выбрасывает `ThreadPoolException`  | Выбрасывает `ThreadPoolException`   |
| Задачи в очереди                  | Выполняются штатно                 | Отклоняются немедленно              |
| Выполняющиеся задачи              | Завершаются штатно                 | Завершаются штатно (текущая итерация)|
| Когда воркеры останавливаются     | После опустошения очереди          | После завершения текущей задачи     |

## Передача пула между потоками

Объект `ThreadPool` сам по себе является потокобезопасным: его можно передавать в `spawn_thread()`
через `use()`, и любой поток сможет вызывать `submit()` на том же самом пуле.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Создаём пул один раз в главном потоке
    $pool = new ThreadPool(workers: 4);

    // Запускаем OS-поток, который тоже будет использовать пул
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

Это позволяет строить архитектуры, где несколько OS-потоков или корутин **разделяют один пул**,
отправляя в него задачи независимо друг от друга.

## Полный пример: параллельная обработка изображений

Пул создаётся один раз. Каждый воркер получает путь к файлу, открывает изображение через GD,
уменьшает его до заданных размеров, переводит в оттенки серого и сохраняет в выходную директорию.
Основной поток собирает результаты по мере готовности.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Функция обрабатывается в воркер-потоке.
// GD-операции CPU-bound — именно такие задачи выигрывают от потоков.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Не удалось прочитать: $src");
    }

    // Открываем источник
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Неподдерживаемый формат: $src"),
    };

    // Resize с сохранением пропорций
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Перевод в оттенки серого
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Сохраняем в выходную директорию
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // Список файлов для обработки
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "Нет файлов для обработки\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() сохраняет порядок — results[i] соответствует files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nОбработано: %d файлов, итого %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Обработано: 20 файлов, итого 876.4 KB
```

## См. также

- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — запуск одной задачи в отдельном потоке
- [`Async\Thread`](/ru/docs/components/threads.html) — OS-потоки и правила передачи данных
- [`Async\ThreadChannel`](/ru/docs/components/thread-channels.html) — потокобезопасные каналы
- [`Async\Future`](/ru/docs/components/future.html) — ожидание результата задачи
