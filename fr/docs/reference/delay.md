---
layout: docs
lang: fr
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /fr/docs/reference/delay.html
page_title: "delay()"
description: "delay() — suspendre une coroutine pendant un nombre donné de millisecondes."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Suspend l'exécution de la coroutine courante pendant le nombre de millisecondes spécifié.

## Description

```php
delay(int $ms): void
```

Suspend la coroutine en cédant le contrôle au planificateur. Après `$ms` millisecondes, la coroutine sera reprise.
Les autres coroutines continuent de s'exécuter pendant l'attente.

## Paramètres

**`ms`**
Temps d'attente en millisecondes. Si `0`, la coroutine cède simplement le contrôle au planificateur (similaire à `suspend()`, mais avec mise en file d'attente).

## Valeurs de retour

Aucune valeur de retour.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // Attendre 1 seconde
    echo "1 second passed\n";
});
?>
```

### Exemple #2 Exécution périodique

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Checking status...\n";
        delay(5000); // Toutes les 5 secondes
    }
});
?>
```

## Notes

> **Note :** `delay()` ne bloque pas l'ensemble du processus PHP — seule la coroutine courante est bloquée.

> **Note :** `delay()` démarre automatiquement le planificateur s'il n'a pas encore été démarré.

## Voir aussi

- [suspend()](/fr/docs/reference/suspend.html) — Céder le contrôle sans délai
- [timeout()](/fr/docs/reference/timeout.html) — Créer un timeout pour limiter l'attente
