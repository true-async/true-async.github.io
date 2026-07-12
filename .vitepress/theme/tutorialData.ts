import type { NavGroup } from './sidebarData'
import { CORE_SLUGS, SERVER_SLUGS } from './tutorialProgress'
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
}

const CORE_ICONS = [
  'zap', 'ban', 'link', 'alert-triangle', 'clock',
  'clock', 'arrow-left-right', 'braces', 'database', 'users',
  'list-checks', 'shuffle', 'layers', 'cpu', 'link',
]
const CORE_TAG_COLORS = [
  'purple', 'orange', 'purple', 'orange', 'orange',
  'purple', 'teal', 'teal', 'blue', 'teal',
  'teal', 'teal', 'blue', 'blue', 'blue',
]
const SERVER_ICONS = [
  'server', 'arrow-left-right', 'shuffle', 'layers', 'section-blocks',
  'plug', 'link', 'cpu', 'section-settings', 'section-code',
]
const SERVER_TAG_COLORS = [
  'teal', 'blue', 'teal', 'orange', 'purple',
  'blue', 'blue', 'orange', 'purple', 'teal',
]

const stringsByLang: Record<string, TutorialStrings> = { ru, en, de, es, fr, it, ko, uk, zh }

export function tutorialStrings(lang: string): TutorialStrings {
  return stringsByLang[lang] || en
}

// Sidebar: two groups (basics + server) built from structure + localized labels.
export function tutorialSidebar(lang: string): NavGroup[] {
  const s = tutorialStrings(lang)
  return [
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
  return [
    { title: s.coreGroup, cards: core },
    { title: s.serverGroup, cards: server },
  ]
}
