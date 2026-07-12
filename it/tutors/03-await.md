---
layout: tutorial
lang: it
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /it/tutors/03-await.html
page_title: "Await"
description: "Perché serve await() e come funziona con le coroutine."
---

# Await

Immagina un classico sistema di backend distribuito. Ci sono una dozzina di servizi collegati tra loro tramite autorizzazione `JWT`.
Un utente effettua il login attraverso `UserDirectory` e arriva a `ProfileService` per modificare alcuni dati aziendali nel suo
profilo, per esempio l'indirizzo di casa o un indirizzo di consegna. Il compito dell'API è aggiornare quei dati:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Se l'operazione è considerata rischiosa, potrebbe essere necessario validare in aggiunta il token JWT
attraverso `UserDirectory`:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}

if (profileExists($userId) && validateToken($token)) {
    updateProfile($userId, $changes);
}
```

Le funzioni `validateToken` e `profileExists` eseguono operazioni di I/O e richiedono tempo, specialmente `validateToken`.
Avrebbe senso eseguire `validateToken` in una coroutine per ridurre il tempo totale di attesa:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Tuttavia, questo codice non funzionerà, poiché `spawn` non può restituire un risultato immediatamente. Ci serve un modo
per attendere la coroutine. È a questo che serve la funzione `await`.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

La funzione `await` mette in pausa il flusso di esecuzione fino a quando la coroutine termina, il che ti permette di
sincronizzare tra loro diverse coroutine.
