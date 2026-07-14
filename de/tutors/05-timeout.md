---
layout: tutorial
lang: de
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /de/tutors/05-timeout.html
page_title: "Timeouts"
description: "Die Wartedauer von await() mit timeout() begrenzen."
---

# Die Wartedauer von await begrenzen

Oft brauchst du eine Garantie, dass eine Operation nicht länger als eine bestimmte vorgegebene Zeit dauert.
Wenn `UserDirectory` beispielsweise zu lange nicht antwortet, kann die `API` sich kaputt anfühlen.
Es gibt hier zwei mögliche Lösungen:
1. Setze einen Timeout auf Ebene der Operation `file_get_contents` und ändere den Code der Funktion.
2. Füge das Limit direkt zu `await` hinzu.

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

Der Vorteil, `await` zu begrenzen, besteht darin, dass der Code von `validateToken` nicht geändert werden muss. Beachte
zugleich das `catch (OperationCanceledException $e)`, nicht `catch (TimeoutException $e)`, wie man
vielleicht erwarten würde.

## OperationCanceledException

`timeout()` wirft von sich aus nichts. Es liefert ein **Abbruch-Token** zurück — ein `Async\Timeout`-Objekt.
Der folgende Code wirft niemals eine Ausnahme, egal wie lange das Skript läuft:

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
    echo $e->getPrevious()->getMessage(); // Meldung aus TimeoutException
}
```

Beachten Sie: Wenn das Token auslöst, erhalten Sie eine `OperationCanceledException`, keine
`TimeoutException`. Der Timeout selbst steckt darin, in `getPrevious()`. Das ist beabsichtigt, um die `try-catch`-Behandlungslogik für
`await` zu vereinfachen und ein abgebrochenes Warten klar von einer Ausnahme zu unterscheiden, die innerhalb der Coroutine ausgelöst wurde.
Coroutinen sollten normalerweise nicht selbst eine `OperationCanceledException` werfen.

Das, was zum Begrenzen eines `await`-Wartens verwendet wird, muss nicht `timeout()` sein; es kann auch jede andere
Coroutine sein, oder ein `Future`, ein logischer Vertrag, der den Abschluss einer beliebigen Operation repräsentiert.
