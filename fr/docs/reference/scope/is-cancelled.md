---
layout: docs
lang: fr
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /fr/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Vérifie si le scope est annulé."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Vérifie si le scope a été annulé. Un scope est marqué comme annulé après un appel à `cancel()` ou `dispose()`.

## Valeur de retour

`bool` — `true` si le scope a été annulé, `false` sinon.

## Exemples

### Exemple #1 Vérification de l'annulation du scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## Voir aussi

- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler le scope
- [Scope::isFinished](/fr/docs/reference/scope/is-finished.html) — Vérifier si le scope est terminé
- [Scope::isClosed](/fr/docs/reference/scope/is-closed.html) — Vérifier si le scope est fermé
