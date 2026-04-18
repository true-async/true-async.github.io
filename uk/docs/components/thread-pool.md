---
layout: docs
lang: uk
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /uk/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — пул робочих потоків для паралельного виконання CPU-bound завдань у TrueAsync."
---

# Async\ThreadPool: пул робочих потоків

## Навіщо ThreadPool

[`spawn_thread()`](/uk/docs/reference/spawn-thread.html) вирішує задачу «одне завдання — один потік»:
запустити важкі обчислення, дочекатися результату, потік завершується. Це зручно, але має ціну:
**кожен запуск потоку — це повний системний виклик**. Ініціалізація окремого PHP-середовища,
завантаження байткоду Opcache, виділення стека — все це відбувається з нуля. При сотнях або
тисячах таких завдань накладні витрати стають помітними.

`Async\ThreadPool` вирішує цю проблему: при запуску створюється фіксований набір **робочих потоків**
(OS-потоки з власним PHP-середовищем), що живуть протягом усього часу роботи програми і
**повторно використовуються** для виконання завдань. Кожен `submit()` поміщає завдання в чергу,
вільний воркер підбирає його, виконує та повертає результат через [`Async\Future`](/uk/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Надіслати 8 завдань у пул з 4 воркерів
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

Вісім завдань виконуються паралельно на чотирьох воркерах. Поки воркери обчислюють — головна
програма (інші корутини) продовжує роботу: `await($f)` призупиняє лише корутину, що чекає, а
не весь процес.

## Коли використовувати ThreadPool замість spawn_thread або корутин

| Сценарій                                                         | Інструмент               |
|------------------------------------------------------------------|--------------------------|
| Одне важке завдання, що запускається рідко                       | `spawn_thread()`         |
| Багато коротких CPU-завдань у циклі                              | `ThreadPool`             |
| Фіксований потік, що живе протягом усієї програми               | `ThreadPool`             |
| I/O: мережа, база даних, файлова система                         | Корутини                 |
| Завдання потрібне негайно, без черги                             | `spawn_thread()`         |

**Ключове правило:** якщо завдань багато і вони короткі — пул амортизує вартість запуску потоків.
Якщо є одне завдання, що запускається раз на кілька секунд — `spawn_thread()` достатньо.

Типовий розмір пулу дорівнює кількості фізичних CPU-ядер (`nproc` на Linux, `sysconf(_SC_NPROCESSORS_ONLN)`
у C). Більше воркерів, ніж ядер, не прискорює CPU-bound навантаження і лише додає накладні витрати
на перемикання контексту.

## Створення пулу

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Параметр     | Тип   | Призначення                                                          | За замовчуванням  |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Кількість робочих потоків. Усі запускаються при створенні пулу       | **обов'язковий**  |
| `$queueSize` | `int` | Максимальна довжина черги очікуючих завдань                          | `workers × 4`     |

Усі робочі потоки запускаються **негайно при створенні** пулу — `new ThreadPool(4)` одразу
створює чотири потоки. Це невеликі «попередні» витрати, але наступні виклики `submit()` не несуть
накладних витрат на запуск потоків.

`$queueSize` обмежує розмір внутрішньої черги завдань. Якщо черга повна (усі воркери зайняті
і в черзі вже є `$queueSize` завдань), наступний `submit()` **призупинить корутину, що викликає**,
доки не звільниться воркер. Значення нуль означає `workers × 4`.

## Надсилання завдань

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Додає завдання до черги пулу. Повертає [`Async\Future`](/uk/docs/components/future.html), який:

- **розв'язується** зі значенням `return` з `$task`, коли воркер завершує виконання;
- **відхиляється** з винятком, якщо `$task` кинув виняток.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Завдання без аргументів
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Завдання з аргументами — аргументи також передаються за значенням (глибока копія)
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

#### Обробка винятків із завдання

Якщо завдання кидає виняток, `Future` відхиляється, а `await()` повторно кидає його в
корутині, що викликає:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### Правила передачі даних

Завдання (`$task`) та всі `...$args` **глибоко копіюються** до робочого потоку — ті самі правила,
що й у `spawn_thread()`. Не можна передавати `stdClass`, PHP-посилання (`&$var`) або ресурси;
спроба це зробити змусить джерело кинути `Async\ThreadTransferException`. Детальніше:
[«Передача даних між потоками»](/uk/docs/components/threads.html#передача-даних-між-потоками).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Застосовує `$task` до кожного елемента `$items` паралельно, використовуючи воркери пулу. **Блокує**
корутину, що викликає, доки всі завдання не завершаться. Повертає масив результатів у тому ж порядку,
що й вхідні дані.

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

Якщо хоча б одне завдання кидає виняток, `map()` повторно кидає його в корутині, що викликає.
Порядок результатів завжди відповідає порядку вхідних елементів, незалежно від порядку завершення
воркерів.

## Моніторинг стану пулу

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Запустити кілька завдань
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Імітація роботи
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Перевірити лічильники під час виконання завдань
    delay(50); // дати воркерам час на запуск
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

| Метод                 | Що повертає                                                                               |
|-----------------------|-------------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Кількість робочих потоків (задана в конструкторі)                                         |
| `getPendingCount()`   | Завдання в черзі, ще не підібрані воркером                                                |
| `getRunningCount()`   | Завдання, що наразі виконуються воркером                                                  |
| `getCompletedCount()` | Загальна кількість завдань, виконаних з моменту створення пулу (монотонно зростає)        |
| `isClosed()`          | `true`, якщо пул було закрито через `close()` або `cancel()`                             |

Лічильники реалізовані як атомарні змінні — вони точні в будь-який момент часу, навіть
коли воркери виконуються в паралельних потоках.

## Зупинка пулу

Робочі потоки живуть, доки пул явно не зупинено. Завжди викликайте `close()`
або `cancel()` після завершення роботи — інакше потоки продовжуватимуть роботу до кінця процесу.

### close() — коректне завершення

```php
$pool->close();
```

Після виклику `close()`:

- Нові виклики `submit()` негайно кидають `Async\ThreadPoolException`.
- Завдання, що вже знаходяться в черзі або виконуються воркерами, **завершуються нормально**.
- Метод повертається лише після того, як усі завдання в процесі виконання завершені та всі
  воркери зупинені.

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

    echo await($f), "\n"; // Гарантовано отримати результат

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — жорстке/примусове завершення

```php
$pool->cancel();
```

Після виклику `cancel()`:

- Нові виклики `submit()` кидають `Async\ThreadPoolException`.
- Завдання в черзі (ще не підібрані воркером) **негайно відхиляються** — відповідні об'єкти
  `Future` переходять у стан «відхилено».
- Завдання, що вже виконуються воркерами, **виконуються до завершення** поточної ітерації
  (примусово перервати PHP-код усередині потоку неможливо).
- Воркери зупиняються одразу після завершення поточного завдання і не підбирають нових.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Заповнити чергу завданнями
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Скасувати негайно — завдання в черзі будуть відхилені
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

### Порівняння close() та cancel()

| Аспект                               | `close()`                          | `cancel()`                            |
|--------------------------------------|------------------------------------|---------------------------------------|
| Нові виклики submit()                | Кидає `ThreadPoolException`        | Кидає `ThreadPoolException`           |
| Завдання в черзі                     | Виконуються нормально              | Відхиляються негайно                  |
| Завдання, що зараз виконуються       | Завершуються нормально             | Завершуються нормально (поточна ітерація) |
| Коли воркери зупиняються             | Після спустошення черги            | Після завершення поточного завдання   |

## Передача пулу між потоками

Об'єкт `ThreadPool` є потокобезпечним: його можна передати до `spawn_thread()` через `use()`,
і будь-який потік може викликати `submit()` на тому самому пулі.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Створити пул один раз у головному потоці
    $pool = new ThreadPool(workers: 4);

    // Запустити OS-потік, який також використовуватиме пул
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

Це дозволяє будувати архітектури, де кілька OS-потоків або корутин **спільно використовують
один пул**, незалежно одне від одного надсилаючи до нього завдання.

## Повний приклад: паралельна обробка зображень

Пул створюється один раз. Кожен воркер отримує шлях до файлу, відкриває зображення через GD,
зменшує його до вказаних розмірів, конвертує у відтінки сірого та зберігає у вихідну директорію.
Головний потік збирає результати в міру їх готовності.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Ця функція виконується у воркер-потоці.
// Операції GD є CPU-bound — саме ті завдання, яким потоки дають перевагу.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Відкрити джерело
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Змінити розмір зі збереженням співвідношення сторін
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Конвертувати у відтінки сірого
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Зберегти у вихідну директорію
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

    // Список файлів для обробки
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() зберігає порядок — results[i] відповідає files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## Дивіться також

- [`spawn_thread()`](/uk/docs/reference/spawn-thread.html) — запуск одного завдання в окремому потоці
- [`Async\Thread`](/uk/docs/components/threads.html) — OS-потоки та правила передачі даних
- [`Async\ThreadChannel`](/uk/docs/components/thread-channels.html) — потокобезпечні канали
- [`Async\Future`](/uk/docs/components/future.html) — очікування результату завдання
