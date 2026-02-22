---
layout: docs
lang: fr
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /fr/docs/reference/signal.html
page_title: "signal()"
description: "signal() — attendre un signal du système d'exploitation avec support d'annulation via Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Attend un signal du système d'exploitation. Retourne un `Future` qui se résout avec une valeur `Signal` lorsque le signal est reçu.

## Description

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Crée un gestionnaire de signal OS à usage unique. Chaque appel à `signal()` crée un nouveau `Future` qui se résout à la première réception du signal spécifié.
Si le paramètre `$cancellation` est fourni, le `Future` sera rejeté lorsque l'annulation se déclenche (par ex., à l'expiration du timeout).

Plusieurs appels à `signal()` avec le même signal fonctionnent indépendamment — chacun recevra une notification.

## Paramètres

**`signal`**
Une valeur de l'enum `Async\Signal` spécifiant le signal attendu. Par exemple : `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Un objet optionnel implémentant `Async\Completable` (par ex., un résultat de l'appel à `timeout()`). Si l'objet d'annulation se déclenche avant l'arrivée du signal, le `Future` sera rejeté avec l'exception correspondante (par ex., `Async\TimeoutException`).

Si l'objet d'annulation est déjà terminé au moment de l'appel, `signal()` retourne immédiatement un `Future` rejeté.

## Valeurs de retour

Retourne `Async\Future<Async\Signal>`. Lorsque le signal est reçu, le `Future` se résout avec la valeur de l'enum `Async\Signal` correspondant au signal reçu.

## Erreurs/Exceptions

- `Async\TimeoutException` — si le timeout s'est déclenché avant la réception du signal.
- `Async\AsyncCancellation` — si l'annulation s'est produite pour une autre raison.

## Exemples

### Exemple #1 Attente d'un signal avec timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Signal received: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Signal not received within 5 seconds\n";
}
?>
```

### Exemple #2 Réception d'un signal depuis une autre coroutine

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Signal received: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Exemple #3 Arrêt gracieux sur SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM received, shutting down...\n";
    graceful_shutdown();
});
?>
```

### Exemple #4 Timeout déjà expiré

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Le timeout a déjà expiré

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Notes

> **Note :** Chaque appel à `signal()` crée un gestionnaire **à usage unique**. Pour attendre le même signal à nouveau, appelez `signal()` une nouvelle fois.

> **Note :** `Signal::SIGINT` et `Signal::SIGBREAK` fonctionnent sur toutes les plateformes, y compris Windows. Les signaux `SIGUSR1`, `SIGUSR2` et les autres signaux POSIX ne sont disponibles que sur les systèmes Unix.

> **Note :** `Signal::SIGKILL` et `Signal::SIGSEGV` ne peuvent pas être interceptés — c'est une limitation du système d'exploitation.

## Signal

L'enum `Async\Signal` définit les signaux OS disponibles :

| Valeur | Signal | Description |
|--------|--------|-------------|
| `Signal::SIGHUP` | 1 | Perte de connexion au terminal |
| `Signal::SIGINT` | 2 | Interruption (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Quitter avec core dump |
| `Signal::SIGILL` | 4 | Instruction illégale |
| `Signal::SIGABRT` | 6 | Terminaison anormale |
| `Signal::SIGFPE` | 8 | Erreur arithmétique en virgule flottante |
| `Signal::SIGKILL` | 9 | Terminaison inconditionnelle |
| `Signal::SIGUSR1` | 10 | Signal utilisateur 1 |
| `Signal::SIGSEGV` | 11 | Violation d'accès mémoire |
| `Signal::SIGUSR2` | 12 | Signal utilisateur 2 |
| `Signal::SIGTERM` | 15 | Demande de terminaison |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Terminaison anormale (alternative) |
| `Signal::SIGWINCH` | 28 | Changement de taille de la fenêtre du terminal |

## Voir aussi

- [timeout()](/fr/docs/reference/timeout.html) — Créer un timeout pour limiter l'attente
- [await()](/fr/docs/reference/await.html) — Attente du résultat d'un Future
- [graceful_shutdown()](/fr/docs/reference/graceful-shutdown.html) — Arrêt gracieux du planificateur
- [Cancellation](/fr/docs/components/cancellation.html) — Mécanisme d'annulation
