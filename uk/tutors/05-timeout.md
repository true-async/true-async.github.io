---
layout: tutorial
lang: uk
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /uk/tutors/05-timeout.html
page_title: "Тайм-аути"
description: "Обмеження часу очікування await() за допомогою timeout()."
---

# Обмеження часу очікування await

Часто потрібна гарантія, що операція не триватиме довше за якийсь заданий час.
Наприклад, якщо `UserDirectory` не відповідає занадто довго, це може створити враження, що `API` зламане.
Тут є два можливі рішення:
1. Встановити тайм-аут на рівні операції `file_get_contents` та змінити код функції.
2. Додати обмеження безпосередньо до `await`.

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

Перевага обмеження `await` в тому, що немає потреби змінювати код `validateToken`. Водночас
зверніть увагу на `catch (OperationCanceledException $e)`, а не `catch (TimeoutException $e)`, як ви
могли б очікувати.

## OperationCanceledException

Якщо ми запустимо наступний код

```php
use function Async\timeout;

$token = timeout(2000);   // just an object; nothing happens
```

The token only takes effect once it is handed to an operation as a cancellation argument:

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // повідомлення з TimeoutException
}
```

Зверніть увагу: коли токен спрацьовує, приходить `OperationCanceledException`, а не `TimeoutException`.
Саме спрацювання таймауту лежить усередині, у `getPrevious()`. Це зроблено навмисно, щоб спростити логіку обробки `try-catch` для
`await` і чітко відрізнити скасоване очікування від винятку, що виник всередині корутини.
Корутини зазвичай не повинні викидати `OperationCanceledException` самостійно.

Те, що використовується для обмеження очікування `await`, не обов'язково має бути `timeout()`; це також може бути будь-яка інша
корутина або `Future`, логічний контракт, що представляє завершення якоїсь довільної операції.
