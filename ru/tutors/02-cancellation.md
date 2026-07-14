---
layout: tutorial
lang: ru
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /ru/tutors/02-cancellation.html
page_title: "Отмена"
description: "Как работает cancel() и кооперативная отмена корутин."
---

# Cancellation

В предыдущем примере был интересный вызов функции `cancel`,
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

А что будет, если его убрать? Попробуйте сделать это. 
Корутина `$progress` крутится в бесконечном цикле с задержкой 1 секунда.
Когда `processUsers` завершается, управление передаётся дальше. Корутина `$progress` продолжает работать. 
До бесконечности. Она не остановится никогда. PHP процесс не остановится никогда (до тех пор, пока не будет убит извне).

`$progress->cancel()` останавливает корутину `$progress`. Но каким образом?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Давайте поменяем код вокруг `delay(1000)` и посмотрим, что происходит:
```bash
Async\AsyncCancellation
```

Когда корутина `$progress` заснула на операции `delay(1000)`, а потом был вызван `cancel()`,
`delay` бросила исключение `Async\AsyncCancellation`. То же самое произойдёт и с обычным `sleep(1)`:
под TrueAsync `sleep()` тоже становится асинхронным и тоже является точкой отмены — он бросит
`Async\AsyncCancellation` точно так же, как `delay`.

Можно сказать, что использование в коде `delay` по сути объявляет контракт с помощью которого другой код может 
прервать выполнение корутины. И это очень удобно, так как позволяет снова разделить ответственность между разными модулями:
1. Корутина не знает, когда её выполнение должно прерваться
2. Код, который отменяет корутину, не знает, как именно корутина будет прервана.

Корутина прерывает выполнение не магическим образом, а с помощью исключения.
Корутина не может быть отменена где-то в середине выполнения, а только в точке, где она сама решает остановиться.
Такой тип отмены называется "кооперативным".

