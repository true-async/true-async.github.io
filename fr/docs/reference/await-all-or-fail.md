---
layout: docs
lang: fr
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /fr/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — attendre l'achèvement de toutes les tâches ; lève une exception à la première erreur."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Attend l'achèvement réussi de **toutes** les tâches. À la première erreur, lève une exception et annule les tâches restantes.

## Description

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Paramètres

**`triggers`**
Une collection itérable d'objets `Async\Completable` (coroutines, Futures, etc.).

**`cancellation`**
Un Awaitable optionnel pour annuler l'ensemble de l'attente (par ex., `timeout()`).

**`preserveKeyOrder`**
Si `true` (par défaut), les résultats sont retournés dans l'ordre des clés du tableau d'entrée. Si `false`, dans l'ordre d'achèvement.

## Valeurs de retour

Un tableau de résultats de toutes les tâches. Les clés correspondent aux clés du tableau d'entrée.

## Erreurs/Exceptions

Lève l'exception de la première tâche ayant échoué.

## Exemples

### Exemple #1 Chargement parallèle de données

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Exemple #2 Avec timeout

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all tasks completed within 5 seconds\n";
}
?>
```

### Exemple #3 Avec Iterator au lieu d'un tableau

Toutes les fonctions de la famille `await_*` acceptent non seulement des tableaux mais tout `iterable`, y compris les implémentations d'`Iterator`. Cela permet de générer des coroutines dynamiquement :

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## Voir aussi

- [await_all()](/fr/docs/reference/await-all.html) — toutes les tâches avec tolérance aux erreurs
- [await()](/fr/docs/reference/await.html) — attente d'une seule tâche
