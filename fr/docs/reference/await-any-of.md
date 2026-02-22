---
layout: docs
lang: fr
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /fr/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — attendre les N premières tâches avec tolérance aux échecs partiels."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Attend les **N premières** tâches terminées, en collectant les résultats et les erreurs séparément. Ne lève pas d'exception lorsque des tâches individuelles échouent.

## Description

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Paramètres

**`count`**
Le nombre de résultats réussis à attendre.

**`triggers`**
Une collection itérable d'objets `Async\Completable`.

**`cancellation`**
Un Awaitable optionnel pour annuler l'attente.

**`preserveKeyOrder`**
Si `true`, les clés des résultats correspondent aux clés du tableau d'entrée.

**`fillNull`**
Si `true`, `null` est placé dans le tableau des résultats pour les tâches qui ont échoué.

## Valeurs de retour

Un tableau de deux éléments : `[$results, $errors]`

- `$results` — tableau des résultats réussis (jusqu'à `$count` éléments)
- `$errors` — tableau des exceptions des tâches ayant échoué

## Exemples

### Exemple #1 Quorum avec tolérance aux erreurs

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Attendre le quorum : 3 réponses sur 5
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quorum reached\n";
} else {
    echo "Quorum not reached, errors: " . count($errors) . "\n";
}
?>
```

## Notes

> **Note :** Le paramètre `triggers` accepte tout `iterable`, y compris les implémentations d'`Iterator`. Voir l'[exemple avec Iterator](/fr/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Voir aussi

- [await_any_of_or_fail()](/fr/docs/reference/await-any-of-or-fail.html) — N premières, interruption en cas d'erreur
- [await_all()](/fr/docs/reference/await-all.html) — toutes les tâches avec tolérance aux erreurs
