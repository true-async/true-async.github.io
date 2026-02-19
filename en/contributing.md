---
layout: page
lang: en
path_key: "/contributing.html"
nav_active: contributing
permalink: /en/contributing.html
page_title: "Contributing"
description: "How to help TrueAsync grow — code, documentation, testing and community"
---

## Project Status

`PHP TrueAsync` is an unofficial project to modify the `PHP` core!
The `RFC` being proposed is currently in an uncertain situation,
and it is unclear whether it will be accepted in the future.

Nevertheless, as the author of the project, I believe that having a **choice** is an important condition for **progress**.
The `PHP TrueAsync` project is open for ideas, suggestions and help.
You can contact me personally by email edmondifthen + proton.me,
or write to the forum: https://github.com/orgs/true-async/discussions

## Ways to Contribute

### Code

- **Bug fixes** — check [open issues](https://github.com/true-async/php-src/issues){:target="_blank"}
  labeled `good first issue` to get started
- **New features** — discuss your idea in [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  before implementing
- **Code review** — help review pull requests, it's a valuable contribution

### Documentation

- **Corrections** — found an inaccuracy? Click "Edit this page" at the bottom of any page
- **Translations** — help translate the documentation into other languages
- **Examples** — write API usage examples for real-world scenarios
- **Tutorials** — create step-by-step guides for specific tasks

### Testing

- **Build testing** — try [installing TrueAsync](/en/download.html)
  on your system and report any issues
- **Writing tests** — increase test coverage for the existing API
- **Load testing** — help find performance bottlenecks

### Community

- **Answer questions** on [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  and [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Spread the word** — talks, articles, blog posts
- **Report bugs** — a detailed bug report saves hours of development time

## Getting Started

### 1. Fork the Repository

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Set Up Your Environment

Follow the [build instructions](/en/download.html) for your platform.
For development, a debug build is recommended:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Create a Branch

```bash
git checkout -b feature/my-improvement
```

### 4. Make Your Changes

- Follow the project's code style
- Add tests for new functionality
- Make sure existing tests pass: `make test`

### 5. Submit a Pull Request

- Describe **what** and **why** you changed
- Reference related issues
- Be prepared for discussion and revisions

## Repository Structure

| Repository | Description |
|------------|-------------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | PHP core with Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Extension with implementation |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | This documentation site |

## Guidelines

- **Small PRs are better than large ones** — one PR solves one task
- **Discuss before implementing** — for major changes, create an issue or discussion first
- **Write tests** — code without tests is harder to accept
- **Document your work** — update docs when changing the API

## Get in Touch

- **GitHub Discussions** — [questions and ideas](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [live chat](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [bug reports](https://github.com/true-async/php-src/issues){:target="_blank"}

Thank you for contributing to the future of PHP!
