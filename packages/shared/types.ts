// Shared TypeScript types for Glance
// These will be populated as we build features

export interface Widget {
  id: string
  account_id: string
  name: string
  domain?: string
  theme_color: string
  button_style: Record<string, unknown>
  hash_prefix: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Tab {
  id: string
  widget_id: string
  type: 'tldr' | 'chat' | 'form' | 'gallery' | 'dynamic' | 'embed' | 'spotify'
  label: string
  icon?: string
  sort_order: number
  is_premium: boolean
  deep_link_hash?: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
