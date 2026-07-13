---
layout: tutorial
lang: it
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /it/tutors/05-timeout.html
page_title: "Timeout"
description: "Limitare per quanto tempo await() attende, usando timeout()."
---

# Limitare per quanto tempo await attende

Spesso serve la garanzia che un'operazione non richieda più di un certo tempo prestabilito.
Per esempio, se `UserDirectory` non risponde per troppo tempo, può far sembrare l'`API` guasta.
Qui ci sono due possibili soluzioni:
1. Impostare un timeout a livello dell'operazione `file_get_contents` e modificare il codice della funzione.
2. Aggiungere un limite direttamente ad `await`.

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

Il vantaggio di limitare `await` è che non c'è bisogno di modificare il codice di `validateToken`. Allo
stesso tempo, nota il `catch (OperationCanceledException $e)`, e non `catch (TimeoutException $e)` come potresti
aspettarti.

## OperationCanceledException

Se eseguiamo il seguente codice

```php
use function Async\timeout;
use Async\OperationCanceledException;
use Async\TimeoutException;

try {
    timeout(2000);
} catch (TimeoutException $e) {
    
}

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // messaggio da TimeoutException
}
```

possiamo vedere che `timeout` lancia una `TimeoutException`, eppure il secondo blocco riceve una
`OperationCanceledException`. Questo è intenzionale, per semplificare la logica di gestione `try-catch` per
`await` e per distinguere chiaramente un'attesa cancellata da un'eccezione sollevata all'interno della coroutine.
Normalmente le coroutine non dovrebbero lanciare `OperationCanceledException` da sole.

Ciò che viene usato per limitare un'attesa `await` non deve essere per forza `timeout()`; può anche essere qualsiasi altra
coroutine, o un `Future`, un contratto logico che rappresenta il completamento di una qualche operazione arbitraria.
