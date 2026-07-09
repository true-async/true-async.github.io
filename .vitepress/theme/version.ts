import releasesData from '../data/releases.json'

// Single source of truth for the current release version, read from the
// CI-maintained releases.json. Used by the homepage and download-page badges
// so the version never has to be hardcoded in two places.
interface ReleaseEntry { version?: string; old?: boolean }
export const CURRENT_VERSION: string =
  (releasesData.versions as ReleaseEntry[]).find((v) => !v.old)?.version || ''
