import { ref } from 'vue'

const STORAGE_KEY = 'trueasync:tutorial-progress'

export const TUTORIAL_SLUGS = [
  '01-coroutines', '02-cancellation', '03-await', '04-exceptions', '05-timeout',
  '06-future', '07-channels', '08-scope', '09-pdo-pool', '10-task-group',
  '11-task-set', '12-iterate', '13-pool', '14-threads', '15-context',
]

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

// Module-level singleton so the button, sidebar checkmarks, and the index
// grid all react to the same state without prop-drilling or a store lib.
export const completedTutorials = ref<Set<string>>(load())

function persist() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedTutorials.value]))
}

export function isTutorialCompleted(slug: string): boolean {
  return completedTutorials.value.has(slug)
}

export function toggleTutorialCompleted(slug: string): void {
  const next = new Set(completedTutorials.value)
  if (next.has(slug)) next.delete(slug)
  else next.add(slug)
  completedTutorials.value = next
  persist()
}

export function completedCount(): number {
  let n = 0
  for (const slug of TUTORIAL_SLUGS) if (completedTutorials.value.has(slug)) n++
  return n
}

export function tutorialSlugFromPath(path: string): string | null {
  const m = path.match(/\/tutors\/([a-z0-9-]+)\.html$/)
  return m ? m[1] : null
}
