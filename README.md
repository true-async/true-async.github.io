<h1 align="center">TrueAsync Documentation</h1>

<p align="center">
  <strong>Native async/await for PHP — coroutines, structured concurrency, and zero-cost abstractions</strong>
</p>

<p align="center">
  <a href="https://true-async.github.io/en/">English</a> ·
  <a href="https://true-async.github.io/ru/">Русский</a> ·
  <a href="https://true-async.github.io/de/">Deutsch</a> ·
  <a href="https://true-async.github.io/it/">Italiano</a> ·
  <a href="https://true-async.github.io/es/">Español</a> ·
  <a href="https://true-async.github.io/fr/">Français</a> ·
  <a href="https://true-async.github.io/uk/">Українська</a> ·
  <a href="https://true-async.github.io/zh/">中文</a> ·
  <a href="https://true-async.github.io/ko/">한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/languages-9-blue?style=flat-square" alt="9 languages">
  <img src="https://img.shields.io/badge/pages-1500%2B-green?style=flat-square" alt="1500+ pages">
  <img src="https://img.shields.io/badge/diagrams-189-orange?style=flat-square" alt="189 diagrams">
  <img src="https://img.shields.io/badge/interactive_demos-3-purple?style=flat-square" alt="3 interactive demos">
</p>

---

## What is TrueAsync?

TrueAsync brings **native coroutines** to PHP at the engine level — no userland hacks, no Fibers, no event loop libraries. It's a proposed extension to PHP core that enables:

- **`spawn()` / `await()`** — familiar async primitives, built into the language
- **Structured concurrency** — Scopes, TaskGroups, and automatic cancellation
- **Channels** — safe data exchange between coroutines
- **Connection pooling** — built-in `PDO Pool` with coroutine-aware connection management
- **Zero overhead** — C-level implementation with libuv reactor

```php
use function Async\{spawn, await};

$users = spawn(fn() => $db->query('SELECT * FROM users'));
$orders = spawn(fn() => $db->query('SELECT * FROM orders'));

[$users, $orders] = await($users, $orders); // concurrent execution
```

## Site Structure

| Section | Description |
|---------|-------------|
| **[Components](https://true-async.github.io/en/docs.html)** | Coroutines, Future, Channels, Scope, Pool, TaskGroup, Context |
| **[API Reference](https://true-async.github.io/en/docs/reference/supported-functions.html)** | Complete reference for 130+ functions and methods |
| **[Architecture](https://true-async.github.io/en/architecture.html)** | Scheduler, Reactor, Events, Waker, GC, FrankenPHP integration |
| **[Evidence](https://true-async.github.io/en/docs/evidence/concurrency-efficiency.html)** | Benchmarks, production cases, academic research |
| **[Interactive Demos](https://true-async.github.io/en/interactive/coroutine-demo.html)** | Visual coroutine timeline, learning map, PDO pool simulator |
| **[RFC](https://true-async.github.io/en/rfc.html)** | Formal proposal for PHP internals |

## Building Locally

```bash
# Prerequisites: Ruby, Bundler
gem install bundler

# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve

# Open http://localhost:4000
```

## Tech Stack

- **[Jekyll](https://jekyllrb.com/)** with GitHub Pages gem
- **[kramdown](https://kramdown.gettalong.org/)** + Rouge for Markdown rendering
- **[KaTeX](https://katex.org/)** for mathematical formulas
- **[PlantUML](https://plantuml.com/)** diagrams pre-rendered to SVG
- Custom i18n system via `_data/i18n/{lang}.yml`

## Repository Map

```
├── ru/                    # Russian (original)
├── en/                    # English
├── de/ it/ es/ fr/        # German, Italian, Spanish, French
├── uk/ zh/ ko/            # Ukrainian, Chinese, Korean
├── diagrams/{lang}/       # SVG diagrams per language
├── _data/
│   ├── i18n/              # Navigation & UI translations
│   └── pages/             # Page-specific data (home, etc.)
├── _includes/             # Shared HTML partials
├── _layouts/              # Page layouts
├── assets/                # CSS, JS, images
└── css/                   # Stylesheets
```

## Contributing

We welcome contributions in any language! See the [Contributing Guide](https://true-async.github.io/en/contributing.html) for details.

- **Translations** — improve or add new languages
- **Content** — fix typos, clarify explanations, add examples
- **Interactive demos** — enhance visualizations

## Related Repositories

| Repository | Description |
|-----------|-------------|
| [true-async/php-src](https://github.com/true-async/php-src) | PHP fork with TrueAsync API |
| [true-async/ext-async](https://github.com/true-async/ext-async) | Extension implementing the Async API |

## License

This documentation is open source. The TrueAsync extension is part of the PHP ecosystem.
