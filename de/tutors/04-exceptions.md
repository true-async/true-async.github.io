---
layout: tutorial
lang: de
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /de/tutors/04-exceptions.html
page_title: "Ausnahmen"
description: "Wie Ausnahmen aus einer Coroutine über await() weitergereicht werden."
---

# Ausnahmen in Coroutinen

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

Die Funktion `validateToken` aus dem vorherigen Kapitel hat einige Probleme.
Wenn `UserDirectory` nicht antwortet (Timeout, Netzwerkausfall, DNS wird nicht aufgelöst), gibt `file_get_contents` den Wert `false` zurück.
`json_decode(false)` gibt `null` zurück, und `null->valid` ist ebenfalls `null`. Die Funktion liefert also einen falsy-Wert,
dasselbe Ergebnis wie bei einem tatsächlich ungültigen Token. `validateToken` hat keine Möglichkeit, "das Token ist abgelaufen"
von "`UserDirectory` hat nicht geantwortet" zu unterscheiden, obwohl das zwei völlig verschiedene Situationen sind.

Der richtige Ansatz ist, eine Ausnahme zu werfen, wenn der Dienst nicht antwortet:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

Aber was passiert, wenn innerhalb einer Coroutine eine Ausnahme geworfen wird?
Wenn in regulärem `PHP`-Code eine Ausnahme geworfen wird und niemand sie fängt, bricht `PHP` mit einer Unhandled-
Exception-Meldung ab. Was ist mit einer Coroutine?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

Auf den ersten Blick sieht es so aus, als gäbe es keinen Unterschied. Doch das ist bei Weitem nicht wahr.
Coroutinen gehören zur Komponente `Scheduler`, die für das Umschalten zwischen ihnen zuständig ist. Jede
Coroutine läuft in ihrem eigenen logischen Strang. Erreicht eine unbehandelte Ausnahme den finalen Handler der Coroutine,
wird sie am Handle der Coroutine gespeichert.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

Mit anderen Worten: Die Ausnahme beendet das Programm nicht, solange noch jemand eine Referenz
auf `$coroutine` hält. Diese Logik garantiert die Idempotenz der Operation `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Wiederholte Aufrufe von `await` auf derselben Coroutine erzeugen dasselbe Verhalten, unabhängig davon, ob die
Coroutine noch läuft oder nicht. So kannst du eine Coroutine wie ein `Future` behandeln, ein Versprechen auf ein Ergebnis,
das irgendwann in der Zukunft verfügbar sein wird. Existiert das Ergebnis bereits, gibt `await` es
sofort zurück.

Jetzt können wir den Code, der das Token validiert und das Profil aktualisiert, verbessern, indem wir Ausnahmebehandlung hinzufügen:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Vielleicht lohnt es sich, die Operation später erneut zu versuchen?
}
```

> Wichtig!
> Nach dem Aufruf von `await` oder einer anderen `await_*`-Operation
> wird die Coroutine als behandelt markiert, und ihre Ausnahme führt nicht mehr dazu,
> dass das PHP-Programm abbricht.
