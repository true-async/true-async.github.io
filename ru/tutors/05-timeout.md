---
layout: tutorial
lang: ru
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /ru/tutors/05-timeout.html
page_title: "Таймауты"
description: "Ограничение времени ожидания await() через timeout()."
---

# Ограничиваем ожидание await

Часто требуется гарантия того, что операция не будет длиться дольше, чем некоторое время. 
Например, если `UserDirectory` не отвечает слишком долго, это может создать ощущение поломки `API`.
Здесь есть два возможных решения:
1. Установить тайм-аут на уровне операции `file_get_contents` и изменить код функции.
2. Добавить ограничение непосредственно для `await`.

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

Выгода ограничения `await` состоит в том, что не требуется менять код `validateToken`. Вместе с тем обратите 
внимание на `catch (OperationCanceledException $e)`, а не `catch (TimeoutException $e)`, как можно было бы 
подумать.

## OperationCanceledException

Сам по себе `timeout()` ничего не бросает. Он возвращает **токен отмены** — объект `Async\Timeout`.
Вот этот код не выбросит исключение никогда, сколько бы ни работал скрипт:

```php
use function Async\timeout;

$token = timeout(2000);   // просто объект, ничего не происходит
```

Токен начинает действовать только тогда, когда его передают операции в качестве ограничения:

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // сообщение из TimeoutException
}
```

Обратите внимание: когда токен срабатывает, приходит `OperationCanceledException`, а не `TimeoutException`.
Само срабатывание таймаута лежит внутри, в `getPrevious()`. Это сделано намеренно, чтобы упростить логику
обработки конструкций `try-catch` для `await` и явно отличать отмену ожидания от исключения внутри корутины.
Обычно корутины не должны бросать `OperationCanceledException`.

В качестве ограничения ожидания `await` может быть и любая другая корутина, а также `Future`, 
логический контракт завершения произвольной операции.