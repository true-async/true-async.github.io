---
layout: tutorial
lang: de
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /de/tutors/03-await.html
page_title: "Await"
description: "Warum await() benötigt wird und wie es mit Coroutinen zusammenspielt."
---

# Await

Stell dir ein klassisches verteiltes Backend-System vor. Es gibt ein Dutzend Dienste, die über `JWT`-Autorisierung miteinander verbunden sind.
Ein Benutzer meldet sich über `UserDirectory` an und landet in `ProfileService`, um geschäftliche Daten in seinem
Profil zu ändern, zum Beispiel seine Wohnadresse oder eine Lieferadresse. Die Aufgabe der API ist es, diese Daten zu aktualisieren:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Wird die Operation als riskant eingestuft, kann es nötig sein, das JWT-Token zusätzlich
über `UserDirectory` zu validieren:

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

Die Funktionen `validateToken` und `profileExists` führen I/O aus und brauchen Zeit, besonders `validateToken`.
Es wäre sinnvoll, `validateToken` in einer Coroutine auszuführen, um die Gesamtwartezeit zu verringern:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Dieser Code funktioniert allerdings nicht, denn `spawn` kann kein Ergebnis sofort zurückgeben. Wir brauchen eine
Möglichkeit, auf die Coroutine zu warten. Genau dafür ist die Funktion `await` da.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

Die Funktion `await` pausiert den Ausführungsfluss, bis die Coroutine fertig ist, was es dir erlaubt,
verschiedene Coroutinen miteinander zu synchronisieren.
