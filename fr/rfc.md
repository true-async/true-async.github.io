---
layout: page
lang: fr
path_key: "/rfc.html"
nav_active: rfc
permalink: /fr/rfc.html
page_title: "RFC"
description: "Propositions officielles pour ajouter l'asynchronie au cœur de PHP"
---

## PHP RFC: True Async

Le projet TrueAsync a été promu pendant environ un an via le processus officiel de `RFC` sur wiki.php.net.
Deux `RFC` ont été publiés décrivant le modèle de concurrence de base
et la concurrence structurée.

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Auteur : Edmond [HT]</span>
<span>Version : 1.7</span>
<span>Version cible : PHP 8.6+</span>
<span class="rfc-badge discussion">Draft</span>
</div>

Le `RFC` principal définissant le modèle de concurrence pour PHP.
Décrit les coroutines, les fonctions `spawn()` / `await()` / `suspend()`,
l'objet `Coroutine`, les interfaces `Awaitable` et `Completable`,
le mécanisme d'annulation coopérative, l'intégration avec `Fiber`,
la gestion des erreurs et l'arrêt gracieux.

**Principes clés :**

- Changements minimaux dans le code existant pour activer la concurrence
- Les coroutines maintiennent l'illusion d'une exécution séquentielle
- Commutation automatique des coroutines lors des opérations d'I/O
- Annulation coopérative — « cancellable by design »
- API C standard pour les extensions

[Lire le RFC sur wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

### RFC #2 — Scope et concurrence structurée

<div class="rfc-meta">
<span>Auteur : Edmond [HT]</span>
<span>Version : 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Une extension du RFC de base. Introduit la classe `Scope`, liant
la durée de vie des coroutines à la portée lexicale.
Décrit la hiérarchie des scopes, la propagation des erreurs,
la politique des coroutines « zombie » et les sections critiques via `protect()`.

**Ce qu'il résout :**

- Prévention des fuites de coroutines en dehors du scope
- Nettoyage automatique des ressources à la sortie du scope
- Annulation hiérarchique : annuler le parent → annule tous les enfants
- Protection des sections critiques contre l'annulation
- Détection des deadlocks et du self-await

[Lire le RFC sur wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

## Comment ces RFC sont liés

Le premier `RFC` définit les **primitives de bas niveau** — coroutines,
fonctions de base et API C pour les extensions. Le second RFC ajoute
la **concurrence structurée** — des mécanismes de gestion de groupes de coroutines
qui rendent le code concurrent sûr et prévisible.

Ensemble, ils forment un modèle complet de programmation asynchrone pour PHP :

|              | RFC #1 : True Async               | RFC #2 : Scope                          |
|--------------|-----------------------------------|-----------------------------------------|
| **Niveau**   | Primitives                        | Gestion                                 |
| **Apporte**  | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()`       |
| **Analogies**| Go goroutines, Kotlin coroutines  | Kotlin CoroutineScope, Python TaskGroup |
| **Objectif** | Exécuter du code concurrent       | Gestion sûre du cycle de vie            |

## Statut actuel du RFC

Actuellement, le projet `TrueAsync` a rencontré une incertitude dans le processus de `RFC`.
Au cours des derniers mois, la discussion s'est pratiquement arrêtée, et il n'y a aucune clarté quant à son avenir.
Il est assez évident que le `RFC` ne pourra pas passer le vote, et il n'y a aucun moyen de changer cela.

Pour ces raisons, le processus de `RFC` est actuellement considéré comme gelé,
et le projet continuera à se développer au sein de la communauté ouverte, sans statut « officiel ».

## Participer à la discussion

Les RFC sont discutés sur la liste de diffusion [internals@lists.php.net](mailto:internals@lists.php.net)
et sur [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

Rejoignez également la discussion sur [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
