---
layout: docs
lang: fr
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /fr/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Marque le scope comme non sûr — les coroutines reçoivent une annulation au lieu de devenir des zombies."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Marque le scope comme « non sûr ». Lorsque `disposeSafely()` est appelé sur un tel scope, les coroutines **ne deviennent pas** des zombies mais reçoivent à la place un signal d'annulation. Cela est utile pour les tâches en arrière-plan qui ne nécessitent pas de garantie d'achèvement.

La méthode retourne le même objet scope, permettant le chaînage de méthodes (interface fluide).

## Valeur de retour

`Scope` — le même objet scope (pour le chaînage de méthodes).

## Exemples

### Exemple #1 Scope pour les tâches en arrière-plan

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Tâche en arrière-plan : nettoyage du cache
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// Avec disposeSafely(), les coroutines seront annulées au lieu de devenir des zombies
$scope->disposeSafely();
```

### Exemple #2 Utilisation avec inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// À la fermeture : les coroutines seront annulées, pas transformées en zombies
$bgScope->disposeSafely();
```

## Voir aussi

- [Scope::disposeSafely](/fr/docs/reference/scope/dispose-safely.html) — Fermer le scope en toute sécurité
- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Fermer le scope de manière forcée
- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler toutes les coroutines
