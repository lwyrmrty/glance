-- Add theme_color to workspaces (for dashboard pages; does not affect Glances/widgets)
alter table workspaces add column if not exists theme_color text default '#7C3AED';
