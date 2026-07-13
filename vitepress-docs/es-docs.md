---
layout: docs
lang: es
path_key: "/docs.html"
nav_active: docs
permalink: /es/docs.html
page_title: "Documentación"
description: "Documentación de TrueAsync. Aprenda a instalar y utilizar verdaderas primitivas asíncronas para PHP."
---

## Introducción {#introduction}

`PHP TrueAsync` es un proyecto que implementa verdadera asincronía en PHP mediante la modificación del núcleo Zend, la biblioteca de E/S,
las bibliotecas de bases de datos, las bibliotecas de sockets y otras funciones.

`PHP TrueAsync` implementa el paradigma de asincronía transparente sin funciones coloreadas,
que minimiza los cambios en el código y elimina la segmentación de bibliotecas.
En otras palabras, al usar corrutinas, se utilizan las mismas funciones sin cambios o con cambios mínimos.

## Compatibilidad con el IDE {#ide-support}

Para autocompletado, documentación en línea y stubs de análisis estático, instala el paquete de desarrollo [`true-async/ide-helper`](https://github.com/true-async/ide-helper). Cubre el núcleo async, el servidor HTTP y el cliente ClickHouse, y funciona con PhpStorm, PHPStan y Psalm.

```bash
composer require --dev true-async/ide-helper
```
