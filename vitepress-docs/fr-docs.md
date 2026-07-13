---
layout: docs
lang: fr
path_key: "/docs.html"
nav_active: docs
permalink: /fr/docs.html
page_title: "Documentation"
description: "Documentation TrueAsync. Apprenez à installer et utiliser de véritables primitives asynchrones pour PHP."
---

## Introduction {#introduction}

`PHP TrueAsync` est un projet qui implémente une véritable asynchronie en PHP en modifiant le noyau Zend, la bibliothèque d'E/S,
les bibliothèques de bases de données, les bibliothèques de sockets et d'autres fonctions.

`PHP TrueAsync` implémente le paradigme d'asynchronie transparente sans fonctions colorées,
qui minimise les modifications du code et élimine la segmentation des bibliothèques.
En d'autres termes, en utilisant les coroutines, vous utilisez les mêmes fonctions sans modifications ou avec des modifications minimales.

## Prise en charge de l'IDE {#ide-support}

Pour l'autocomplétion, la documentation intégrée et les stubs d'analyse statique, installez le paquet de développement [`true-async/ide-helper`](https://github.com/true-async/ide-helper). Il couvre le cœur async, le serveur HTTP et le client ClickHouse, et fonctionne avec PhpStorm, PHPStan et Psalm.

```bash
composer require --dev true-async/ide-helper
```
