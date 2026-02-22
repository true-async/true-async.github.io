---
layout: docs
lang: fr
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /fr/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — attendre toutes les tâches avec tolérance aux échecs partiels."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Attend l'achèvement de **toutes** les tâches, en collectant les résultats et les erreurs séparément. Ne lève pas d'exception lorsque des tâches individuelles échouent.

## Description

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Paramètres

**`triggers`**
Une collection itérable d'objets `Async\Completable`.

**`cancellation`**
Un Awaitable optionnel pour annuler l'ensemble de l'attente.

**`preserveKeyOrder`**
Si `true` (par défaut), les résultats sont dans l'ordre des clés du tableau d'entrée. Si `false`, dans l'ordre d'achèvement.

**`fillNull`**
Si `true`, `null` est placé dans le tableau des résultats pour les tâches qui ont échoué. Si `false` (par défaut), les clés avec des erreurs sont omises.

## Valeurs de retour

Un tableau de deux éléments : `[$results, $errors]`

- `$results` — tableau des résultats réussis
- `$errors` — tableau des exceptions (les clés correspondent aux clés des tâches d'entrée)

## Exemples

### Exemple #1 Tolérance aux échecs partiels

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results contient 'fast' et 'slow'
// $errors contient 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Task '$key' failed: {$error->getMessage()}\n";
}
?>
```

### Exemple #2 Avec fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (au lieu d'une clé manquante)
?>
```

## Notes

> **Note :** Le paramètre `triggers` accepte tout `iterable`, y compris les implémentations d'`Iterator`. Les coroutines peuvent être créées dynamiquement pendant l'itération. Voir l'[exemple avec Iterator](/fr/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Voir aussi

- [await_all_or_fail()](/fr/docs/reference/await-all-or-fail.html) — toutes les tâches, interruption en cas d'erreur
- [await_any_or_fail()](/fr/docs/reference/await-any-or-fail.html) — premier résultat
