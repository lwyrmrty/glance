-- ============================================
-- WORKSPACE WEBHOOKS
-- Allows workspace owners to subscribe to events
-- (account_created, form_submitted, chat_started)
-- with multiple webhook URLs.
-- ============================================

create table workspace_webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null default '',           -- user-friendly label, e.g. "Zapier — new leads"
  url text not null,                       -- the webhook endpoint URL
  event_types text[] not null default '{}', -- e.g. {'account_created','form_submitted'}
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup when firing webhooks
create index idx_workspace_webhooks_workspace on workspace_webhooks(workspace_id, is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table workspace_webhooks enable row level security;

-- Workspace members can view webhooks
create policy "Workspace members can view webhooks"
  on workspace_webhooks for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Owners/admins can create webhooks
create policy "Owners and admins can create webhooks"
  on workspace_webhooks for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Owners/admins can update webhooks
create policy "Owners and admins can update webhooks"
  on workspace_webhooks for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Owners/admins can delete webhooks
create policy "Owners and admins can delete webhooks"
  on workspace_webhooks for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );
