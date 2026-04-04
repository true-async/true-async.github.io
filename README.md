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
# Prerequisites: Node.js 22+
node -v

# Install dependencies
npm install

# Serve locally with hot reload
npm run dev

# Open http://localhost:5173
```

## Tech Stack

- **[VitePress](https://vitepress.dev/)** — Vue-powered static site generator
- **[Vue 3](https://vuejs.org/)** — custom theme with SFC components
- **[Shiki](https://shiki.style/)** — syntax highlighting with dual light/dark themes
- **[MathJax](https://www.mathjax.org/)** — mathematical formulas (built-in VitePress support)
- Custom i18n system with 9 languages
- Dark/light theme with system preference detection

## Repository Map

```
├── .vitepress/
│   ├── config.mts             # VitePress configuration
│   └── theme/                 # Custom Vue theme
│       ├── Layout.vue         # Main layout
│       ├── Navbar.vue         # Navigation bar
│       ├── Sidebar.vue        # Docs sidebar
│       ├── Footer.vue         # Site footer
│       ├── HomePage.vue       # Landing page
│       ├── LearningMap.vue    # Interactive learning map (SVG)
│       ├── DownloadPage.vue   # Downloads page
│       ├── style.css          # Global styles + dark theme
│       └── sidebarData*.ts    # Sidebar navigation per language
├── en/ ru/ de/ ...            # Content per language (9 dirs)
├── vitepress-docs/            # Docs main pages
├── diagrams/{lang}/           # SVG diagrams per language
├── assets/                    # Images, logos
└── package.json
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
| [true-async/php-async](https://github.com/true-async/php-async) | Extension implementing the Async API |

## License

This documentation is open source. The TrueAsync extension is part of the PHP ecosystem.
