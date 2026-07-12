import type { NavGroup } from './sidebarData'
import { CORE_SLUGS, SERVER_SLUGS, LARAVEL_SLUGS } from './tutorialProgress'
import ru from './tutorialStrings/ru'
import en from './tutorialStrings/en'
import de from './tutorialStrings/de'
import es from './tutorialStrings/es'
import fr from './tutorialStrings/fr'
import it from './tutorialStrings/it'
import ko from './tutorialStrings/ko'
import uk from './tutorialStrings/uk'
import zh from './tutorialStrings/zh'

// One tutorial has two series: locale-independent STRUCTURE lives here, the
// per-locale STRINGS live in ./tutorialStrings/<lang>.ts. A card/lesson is the
// zip of the two, index-aligned to CORE_SLUGS / SERVER_SLUGS.
export interface TutorialItemStrings {
  label: string
  body: string
}
export interface TutorialStrings {
  coreGroup: string
  serverGroup: string
  progress: string
  readMore: string
  core: TutorialItemStrings[]
  server: TutorialItemStrings[]
  // Laravel series only exists for locales that have translated it (ru so far);
  // other locale string files simply omit these two fields.
  laravelGroup?: string
  laravel?: TutorialItemStrings[]
}

// One icon per lesson concept — kept distinct within each series so the
// sidebar doesn't repeat the same glyph twice in a row (was: clock x2, link x2).
const CORE_ICONS = [
  'zap', 'ban', 'hourglass', 'alert-triangle', 'clock',
  'sparkles', 'arrow-left-right', 'braces', 'database', 'users',
  'list-checks', 'shuffle', 'layers', 'cpu', 'target',
]
const CORE_TAG_COLORS = [
  'purple', 'orange', 'purple', 'orange', 'orange',
  'purple', 'teal', 'teal', 'blue', 'teal',
  'teal', 'teal', 'blue', 'blue', 'blue',
]
const SERVER_ICONS = [
  'server', 'repeat', 'nested-squares', 'waves', 'file',
  'rss', 'message-circle', 'columns', 'shield-check', 'section-code',
]
const SERVER_TAG_COLORS = [
  'teal', 'blue', 'teal', 'orange', 'purple',
  'blue', 'blue', 'orange', 'purple', 'teal',
]
const LARAVEL_ICONS = ['plug', 'database', 'route', 'shield-alert', 'section-puzzle']
const LARAVEL_TAG_COLORS = ['purple', 'blue', 'teal', 'orange', 'teal']

const stringsByLang: Record<string, TutorialStrings> = { ru, en, de, es, fr, it, ko, uk, zh }

export function tutorialStrings(lang: string): TutorialStrings {
  return stringsByLang[lang] || en
}

// Sidebar: groups built from structure + localized labels. The Laravel group
// only appears for locales whose strings file actually fills it in.
export function tutorialSidebar(lang: string): NavGroup[] {
  const s = tutorialStrings(lang)
  const groups: NavGroup[] = [
    {
      title: s.coreGroup,
      icon: 'workflow',
      items: CORE_SLUGS.map((slug, i) => ({
        url: `/${lang}/tutors/${slug}.html`,
        label: s.core[i]?.label ?? slug,
        icon: CORE_ICONS[i],
      })),
    },
    {
      title: s.serverGroup,
      icon: 'server',
      items: SERVER_SLUGS.map((slug, i) => ({
        url: `/${lang}/tutors-server/${slug}.html`,
        label: s.server[i]?.label ?? slug,
        icon: SERVER_ICONS[i],
      })),
    },
  ]
  if (s.laravel?.length) {
    groups.push({
      title: s.laravelGroup ?? 'Laravel',
      icon: 'laravel',
      items: LARAVEL_SLUGS.map((slug, i) => ({
        url: `/${lang}/tutors-laravel/${slug}.html`,
        label: s.laravel![i]?.label ?? slug,
        icon: LARAVEL_ICONS[i],
      })),
    })
  }
  return groups
}

export interface TutorialCard {
  slug: string
  url: string
  tag: string
  tagColor: string
  title: string
  body: string
}

// Index-page card grid: one section per series.
export function tutorialSections(lang: string): { title: string; cards: TutorialCard[] }[] {
  const s = tutorialStrings(lang)
  const core = CORE_SLUGS.map((slug, i) => ({
    slug,
    url: `/${lang}/tutors/${slug}.html`,
    tag: String(i + 1).padStart(2, '0'),
    tagColor: CORE_TAG_COLORS[i],
    title: s.core[i]?.label ?? slug,
    body: s.core[i]?.body ?? '',
  }))
  const server = SERVER_SLUGS.map((slug, i) => ({
    slug,
    url: `/${lang}/tutors-server/${slug}.html`,
    tag: String(i + 1).padStart(2, '0'),
    tagColor: SERVER_TAG_COLORS[i],
    title: s.server[i]?.label ?? slug,
    body: s.server[i]?.body ?? '',
  }))
  const sections = [
    { title: s.coreGroup, cards: core },
    { title: s.serverGroup, cards: server },
  ]
  if (s.laravel?.length) {
    sections.push({
      title: s.laravelGroup ?? 'Laravel',
      cards: LARAVEL_SLUGS.map((slug, i) => ({
        slug,
        url: `/${lang}/tutors-laravel/${slug}.html`,
        tag: String(i + 1).padStart(2, '0'),
        tagColor: LARAVEL_TAG_COLORS[i],
        title: s.laravel![i]?.label ?? slug,
        body: s.laravel![i]?.body ?? '',
      })),
    })
  }
  return sections
}
