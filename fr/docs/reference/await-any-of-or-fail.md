---
layout: docs
lang: fr
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /fr/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — attendre les N premières tâches terminées avec succès."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Attend les **N premières** tâches terminées avec succès. Si l'une des N premières échoue, lève une exception.

## Description

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Paramètres

**`count`**
Le nombre de résultats réussis à attendre. Si `0`, retourne un tableau vide.

**`triggers`**
Une collection itérable d'objets `Async\Completable`.

**`cancellation`**
Un Awaitable optionnel pour annuler l'attente.

**`preserveKeyOrder`**
Si `true`, les clés des résultats correspondent aux clés du tableau d'entrée. Si `false`, dans l'ordre d'achèvement.

## Valeurs de retour

Un tableau de `$count` résultats réussis.

## Erreurs/Exceptions

Si une tâche échoue avant d'atteindre `$count` succès, l'exception est levée.

## Exemples

### Exemple #1 Obtenir 2 résultats sur 5

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Attendre 2 réponses réussies quelconques
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Notes

> **Note :** Le paramètre `triggers` accepte tout `iterable`, y compris les implémentations d'`Iterator`. Voir l'[exemple avec Iterator](/fr/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Voir aussi

- [await_any_of()](/fr/docs/reference/await-any-of.html) — N premières avec tolérance aux erreurs
- [await_all_or_fail()](/fr/docs/reference/await-all-or-fail.html) — toutes les tâches
