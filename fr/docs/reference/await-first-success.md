---
layout: docs
lang: fr
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /fr/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — attendre la première tâche terminée avec succès, en ignorant les erreurs des autres."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Attend la **première** tâche terminée avec succès. Les erreurs des autres tâches sont collectées séparément et n'interrompent pas l'attente.

## Description

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Paramètres

**`triggers`**
Une collection itérable d'objets `Async\Completable`.

**`cancellation`**
Un Awaitable optionnel pour annuler l'attente.

## Valeurs de retour

Un tableau de deux éléments : `[$result, $errors]`

- `$result` — le résultat de la première tâche terminée avec succès (ou `null` si toutes les tâches ont échoué)
- `$errors` — tableau des exceptions des tâches ayant échoué avant le premier succès

## Exemples

### Exemple #1 Requête tolérante aux pannes

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Essayer plusieurs serveurs ; prendre la première réponse réussie
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Data received\n";
} else {
    echo "All servers unavailable\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Notes

> **Note :** Le paramètre `triggers` accepte tout `iterable`, y compris les implémentations d'`Iterator`. Voir l'[exemple avec Iterator](/fr/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Voir aussi

- [await_any_or_fail()](/fr/docs/reference/await-any-or-fail.html) — première tâche, interruption en cas d'erreur
- [await_all()](/fr/docs/reference/await-all.html) — toutes les tâches avec tolérance aux erreurs
