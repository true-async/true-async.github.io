---
layout: docs
lang: fr
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /fr/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — attendre la première tâche terminée."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Attend la **première** tâche terminée. Si la première tâche terminée a levé une exception, celle-ci est propagée.

## Description

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Paramètres

**`triggers`**
Une collection itérable d'objets `Async\Completable`.

**`cancellation`**
Un Awaitable optionnel pour annuler l'attente.

## Valeurs de retour

Le résultat de la première tâche terminée.

## Erreurs/Exceptions

Si la première tâche terminée a levé une exception, celle-ci sera propagée.

## Exemples

### Exemple #1 Course de requêtes

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Le premier à répondre gagne
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Received response from the fastest mirror\n";
?>
```

## Notes

> **Note :** Le paramètre `triggers` accepte tout `iterable`, y compris les implémentations d'`Iterator`. Voir l'[exemple avec Iterator](/fr/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Voir aussi

- [await_first_success()](/fr/docs/reference/await-first-success.html) — premier succès, en ignorant les erreurs
- [await_all_or_fail()](/fr/docs/reference/await-all-or-fail.html) — toutes les tâches
