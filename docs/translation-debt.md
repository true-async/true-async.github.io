# Translation debt

The design/structure is unified across all locales (shared structure split from
per-locale strings). The per-locale **translations are now complete** for the
homepage and the RFC / coroutine-demo components — this file tracks only what is
left.

## Done — all 9 locales translated

- **HomePage.vue** — `hero.slogan`, `features.heading` and the full `guides`
  block translated for de/es/fr/it/ko/uk/zh (previously English placeholders).
- **RfcPage.vue** — full `rfcI18n` blocks added for all 7 remaining locales.
- **CoroutineDemoPage.vue** — full `i18n` blocks added for all 7 remaining locales.
- **DownloadPage.vue** — was already localised; 34 dead pre-redesign i18n keys
  removed; `badge` label added for all 9.

The old hand-written RFC markdown and the old static coroutine-demo HTML (from
before those pages adopted the components) remain in git history if any wording
is ever worth cross-checking.

## Remaining (minor / optional)

- _None._ Everything below has been resolved.

## Also done

- **Social meta description** — `og:description` / `twitter:description` are now
  injected per-locale via `transformHead` in `.vitepress/config.mts` (locale
  derived from the first path segment, English fallback). All 9 locales carry a
  translated social-share description; the old static English tags were removed
  so there is exactly one of each per page.
