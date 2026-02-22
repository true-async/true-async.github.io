---
layout: docs
lang: fr
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /fr/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — arrêt gracieux du planificateur avec annulation de toutes les coroutines."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Initie un arrêt gracieux du planificateur. Toutes les coroutines reçoivent une demande d'annulation.

## Description

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Démarre la procédure d'arrêt gracieux : toutes les coroutines actives sont annulées, et l'application continue de fonctionner jusqu'à ce qu'elles se terminent naturellement.

## Paramètres

**`cancellationError`**
Une erreur d'annulation optionnelle à transmettre aux coroutines. Si non spécifiée, un message par défaut est utilisé.

## Valeurs de retour

Aucune valeur de retour.

## Exemples

### Exemple #1 Gestion d'un signal de terminaison

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Serveur traitant des requêtes
spawn(function() {
    // À la réception d'un signal — arrêter gracieusement
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server shutdown'));
    });

    while (true) {
        // Traitement des requêtes...
    }
});
?>
```

## Notes

> **Note :** Les coroutines créées **après** l'appel à `graceful_shutdown()` seront immédiatement annulées.

> **Note :** `exit` et `die` déclenchent automatiquement un arrêt gracieux.

## Voir aussi

- [Cancellation](/fr/docs/components/cancellation.html) — Mécanisme d'annulation
- [Scope](/fr/docs/components/scope.html) — Gestion du cycle de vie
