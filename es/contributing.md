---
layout: page
lang: es
path_key: "/contributing.html"
nav_active: contributing
permalink: /es/contributing.html
page_title: "Contribuir"
description: "Cómo ayudar al crecimiento de TrueAsync — código, documentación, pruebas y comunidad"
---

## Estado del proyecto

`PHP TrueAsync` es un proyecto no oficial para modificar el núcleo de `PHP`.
El `RFC` que se propone actualmente se encuentra en una situación incierta,
y no está claro si será aceptado en el futuro.

Sin embargo, como autor del proyecto, creo que tener una **elección** es una condición importante para el **progreso**.
El proyecto `PHP TrueAsync` está abierto a ideas, sugerencias y ayuda.
Puede contactarme personalmente por email: edmondifthen + proton.me,
o escribir en el foro: https://github.com/orgs/true-async/discussions

## Formas de contribuir

### Código

- **Corrección de errores** — revise los [issues abiertos](https://github.com/true-async/php-src/issues){:target="_blank"}
  con la etiqueta `good first issue` para empezar
- **Nuevas funcionalidades** — discuta su idea en [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  antes de implementar
- **Revisión de código** — ayude revisando pull requests, es una contribución valiosa

### Documentación

- **Correcciones** — ¿encontró una inexactitud? Haga clic en «Editar página» al final de cualquier página
- **Traducciones** — ayude a traducir la documentación a otros idiomas
- **Ejemplos** — escriba ejemplos de uso de la API para escenarios reales
- **Tutoriales** — cree guías paso a paso para tareas específicas

### Pruebas

- **Pruebas de compilación** — pruebe [instalar TrueAsync](/es/download.html)
  en su sistema y reporte cualquier problema
- **Escribir pruebas** — aumente la cobertura de pruebas para la API existente
- **Pruebas de carga** — ayude a encontrar cuellos de botella de rendimiento

### Comunidad

- **Responda preguntas** en [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  y [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Difunda el proyecto** — charlas, artículos, publicaciones en blogs
- **Reporte errores** — un reporte detallado ahorra horas de desarrollo

## Cómo empezar

### 1. Haga fork del repositorio

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Configure su entorno

Siga las [instrucciones de compilación](/es/download.html) para su plataforma.
Para desarrollo, se recomienda una compilación con debug:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Cree una rama

```bash
git checkout -b feature/my-improvement
```

### 4. Realice sus cambios

- Siga el estilo de código del proyecto
- Agregue pruebas para la nueva funcionalidad
- Asegúrese de que las pruebas existentes pasen: `make test`

### 5. Envíe un Pull Request

- Describa **qué** y **por qué** cambió
- Haga referencia a los issues relacionados
- Esté preparado para discusión y revisiones

## Estructura de repositorios

| Repositorio | Descripción |
|-------------|-------------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Núcleo PHP con Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Extensión con implementación |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Este sitio de documentación |

## Directrices

- **PRs pequeños son mejores que grandes** — un PR resuelve una tarea
- **Discuta antes de implementar** — para cambios grandes, cree primero un issue o discussion
- **Escriba pruebas** — código sin pruebas es más difícil de aceptar
- **Documente su trabajo** — actualice la documentación al cambiar la API

## Contacto

- **GitHub Discussions** — [preguntas e ideas](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [chat en vivo](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [reportes de errores](https://github.com/true-async/php-src/issues){:target="_blank"}

¡Gracias por contribuir al futuro de PHP!
