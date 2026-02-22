---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Liberer le scope du groupe."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Appelle `dispose()` sur le scope interne du groupe, ce qui entraine l'annulation de toutes les coroutines.

## Voir aussi

- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) --- Annuler toutes les taches
- [Scope](/fr/docs/components/scope.html) --- Gestion du cycle de vie des coroutines
