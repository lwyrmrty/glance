-- Add logo_url to workspaces (displayed as workspace icon when no Glances exist)
alter table workspaces add column if not exists logo_url text;
