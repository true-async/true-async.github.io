---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Verifier si toutes les taches sont terminees."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Retourne `true` si la file d'attente est vide et qu'il n'y a pas de coroutines actives.

Cet etat peut etre temporaire : si le groupe n'est pas scelle, de nouvelles taches peuvent encore etre ajoutees.

## Voir aussi

- [TaskGroup::isSealed](/fr/docs/reference/task-group/is-sealed.html) --- Verifier si le groupe est scelle
- [TaskGroup::awaitCompletion](/fr/docs/reference/task-group/await-completion.html) --- Attendre la fin
