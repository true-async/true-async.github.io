# Translation debt

Strings that are shown in **English as a placeholder** because a locale has not
been translated yet. The design/structure is already unified across all locales
(see the refactor that split shared structure from per-locale strings) — only the
text below needs translating.

## HomePage — `.vitepress/theme/HomePage.vue`

The `strings` object holds per-locale text. For **de, es, fr, it, ko, uk, zh** the
following are still English placeholders and need translation:

| Field | Current placeholder | Notes |
|---|---|---|
| `hero.slogan` | `"Write sync. Run async."` | short tagline under the H1 |
| `features.heading` | `"Production-ready API"` | the H2 above the feature grid (the eyebrow `features.title` is already translated) |
| `guides.*` | the shared `guidesEn` block | the whole "Guides & Articles" section: `title`, `heading`, `description`, `readMore`, and all 6 items (`tag`, `time`, `title`, `body`) |

**How to translate:** in `HomePage.vue`, for the locale replace `guides: guidesEn,`
with a full translated `guides: { … }` block (copy the shape from `en`/`ru`), and
translate that locale's `hero.slogan` and `features.heading`.

`en` and `ru` are fully translated. Their `guides` blocks are the reference shape.

## Still TODO elsewhere (separate task, not started)

- **RfcPage.vue** — all 9 locales now render this component (de/es/fr/it/ko/uk/zh
  `rfc.md` switched to `layout: rfc`). Only `en` + `ru` are translated in the
  component's `rfcI18n`; the other 7 fall back to English. **To translate:** add a
  locale block to `rfcI18n` in `RfcPage.vue` (copy the `en` shape). The 7 locales'
  previous hand-written RFC markdown translations are preserved in git history
  (the commit right before the `layout: rfc` switch) if you want to reuse them.
- **CoroutineDemoPage.vue** — all 9 locales now render this component
  (`xx/interactive/coroutine-demo.md` wrappers added; the old static
  `public/xx/interactive/coroutine-demo.html` + root `xx/interactive/
  coroutine-demo.html` demos removed). Only `en` + `ru` are translated in the
  component's `i18n`; the other 7 fall back to English. **To translate:** add a
  locale block to `i18n` in `CoroutineDemoPage.vue` (copy the `en` shape). The
  old translated static demos are preserved in git history (the commit before
  they were removed) if any wording is worth reusing.
- **DownloadPage.vue** — done: it was already properly localised (shared
  template + per-locale strings), so no split was needed; it just carried 34
  dead pre-redesign i18n keys, now removed. All 9 locales complete (incl. the
  new `badge` label).
