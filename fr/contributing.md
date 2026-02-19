---
layout: page
lang: fr
path_key: "/contributing.html"
nav_active: contributing
permalink: /fr/contributing.html
page_title: "Contribuer"
description: "Comment aider TrueAsync à se développer — code, documentation, tests et communauté"
---

## Statut du projet

`PHP TrueAsync` est un projet non officiel visant à modifier le cœur de `PHP` !
Le `RFC` proposé se trouve actuellement dans une situation incertaine,
et il n'est pas clair s'il sera accepté à l'avenir.

Néanmoins, en tant qu'auteur du projet, je crois que l'existence d'un **choix** est une condition importante pour le **progrès**.
Le projet `PHP TrueAsync` est ouvert aux idées, suggestions et contributions.
Vous pouvez me contacter personnellement par email : edmondifthen + proton.me,
ou écrire sur le forum : https://github.com/orgs/true-async/discussions

## Façons de contribuer

### Code

- **Corrections de bugs** — consultez les [issues ouvertes](https://github.com/true-async/php-src/issues){:target="_blank"}
  avec le label `good first issue` pour commencer
- **Nouvelles fonctionnalités** — discutez votre idée dans les [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  avant de l'implémenter
- **Revue de code** — aidez à réviser les pull requests, c'est une contribution précieuse

### Documentation

- **Corrections** — trouvé une inexactitude ? Cliquez sur « Modifier la page » en bas de chaque page
- **Traductions** — aidez à traduire la documentation dans d'autres langues
- **Exemples** — écrivez des exemples d'utilisation de l'API pour des scénarios réels
- **Tutoriels** — créez des guides étape par étape pour des tâches spécifiques

### Tests

- **Tests de compilation** — essayez [d'installer TrueAsync](/fr/download.html)
  sur votre système et signalez les problèmes
- **Écriture de tests** — augmentez la couverture de tests pour l'API existante
- **Tests de charge** — aidez à trouver les goulots d'étranglement de performance

### Communauté

- **Répondez aux questions** sur [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  et [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Faites connaître le projet** — présentations, articles, billets de blog
- **Signalez les bugs** — un rapport de bug détaillé fait gagner des heures de développement

## Pour commencer

### 1. Forkez le dépôt

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Configurez votre environnement

Suivez les [instructions de compilation](/fr/download.html) pour votre plateforme.
Pour le développement, une compilation debug est recommandée :

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Créez une branche

```bash
git checkout -b feature/my-improvement
```

### 4. Effectuez vos modifications

- Suivez le style de code du projet
- Ajoutez des tests pour les nouvelles fonctionnalités
- Assurez-vous que les tests existants passent : `make test`

### 5. Soumettez un Pull Request

- Décrivez **quoi** et **pourquoi** vous avez modifié
- Référencez les issues liées
- Soyez prêt pour la discussion et les révisions

## Structure des dépôts

| Dépôt | Description |
|-------|-------------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Cœur PHP avec Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Extension avec implémentation |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Ce site de documentation |

## Recommandations

- **Les petits PRs valent mieux que les grands** — un PR résout une tâche
- **Discutez avant d'implémenter** — pour les changements majeurs, créez d'abord une issue ou une discussion
- **Écrivez des tests** — le code sans tests est plus difficile à accepter
- **Documentez** — mettez à jour la documentation lors des changements d'API

## Contact

- **GitHub Discussions** — [questions et idées](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [chat en direct](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [rapports de bugs](https://github.com/true-async/php-src/issues){:target="_blank"}

Merci pour votre contribution à l'avenir de PHP !
