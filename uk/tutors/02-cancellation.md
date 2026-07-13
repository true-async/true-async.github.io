---
layout: tutorial
lang: uk
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /uk/tutors/02-cancellation.html
page_title: "Скасування"
description: "Як працює cancel() та кооперативне скасування корутин."
---

# Скасування

У попередньому прикладі був цікавий виклик функції `cancel`,
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

Що станеться, якщо його прибрати? Спробуйте самі.
Корутина `$progress` крутиться в нескінченному циклі з затримкою в 1 секунду.
Коли `processUsers` завершується, керування рухається далі. Корутина `$progress` продовжує працювати.
Вічно. Вона ніколи не зупиниться. Процес PHP ніколи не зупиниться (якщо його не завершити ззовні).

`$progress->cancel()` зупиняє корутину `$progress`. Але як?

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

Змінімо код навколо `delay(1000)` і подивімося, що станеться:
```bash
Async\AsyncCancellation
```

Коли корутина `$progress` спала всередині `delay(1000)`, а потім було викликано `cancel()`,
`delay` викинула виняток `Async\AsyncCancellation`. Цікаво, що цей трюк не працює зі `sleep(1)`,
оскільки `sleep(1)` не викидає винятку, тоді як `delay` викидає, і саме на це ми тут і покладаємося.

Можна сказати, що використання `delay` у вашому коді фактично встановлює контракт, який дозволяє іншому коду
перервати виконання корутини. Це дуже зручно, оскільки знову ж таки розділяє відповідальність
між різними модулями:
1. Корутина не знає, коли її виконання буде перервано.
2. Код, який скасовує корутину, не знає, яким саме чином корутину буде перервано.

Корутина зупиняється не якоюсь магією, вона зупиняється через виняток.
Корутину неможливо скасувати посеред якоїсь довільної операції, лише в точці, де вона
сама вирішує поступитися керуванням. Такий тип скасування називається "кооперативним".
