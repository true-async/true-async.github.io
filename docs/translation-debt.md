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

- **RfcPage.vue** and **CoroutineDemoPage.vue** only have `en` + `ru`; the other
  7 locales fall back to English at runtime. Same split-structure-from-strings
  treatment + translation needed.
- **DownloadPage.vue** — done: it was already properly localised (shared
  template + per-locale strings), so no split was needed; it just carried 34
  dead pre-redesign i18n keys, now removed. All 9 locales complete (incl. the
  new `badge` label).
