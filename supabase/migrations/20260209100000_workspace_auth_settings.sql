-- ============================================
-- Add auth customization settings to workspaces
-- These control the premium content login gate
-- ============================================

-- Auth provider toggles
alter table workspaces add column if not exists auth_google_enabled boolean not null default false;
alter table workspaces add column if not exists auth_magic_link_enabled boolean not null default true;

-- Per-workspace Google OAuth credentials
alter table workspaces add column if not exists auth_google_client_id text;
alter table workspaces add column if not exists auth_google_client_secret text;

-- Login card customization
alter table workspaces add column if not exists auth_banner_url text;
alter table workspaces add column if not exists auth_title text not null default 'Premium Content';
alter table workspaces add column if not exists auth_subtitle text not null default 'Login or create your FREE account to access this content.';
