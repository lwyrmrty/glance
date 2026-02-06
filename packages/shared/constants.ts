// Shared constants for Glance

export const TAB_TYPES = [
  'tldr',
  'chat', 
  'form',
  'gallery',
  'dynamic',
  'embed',
  'spotify',
] as const

export const DEFAULT_THEME_COLOR = '#572e6f' // --vcs-purple

export const DEFAULT_HASH_PREFIX = 'glance'

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export const EVENT_BATCH_INTERVAL_MS = 30 * 1000 // 30 seconds
