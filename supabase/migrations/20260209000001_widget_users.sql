-- ============================================
-- WIDGET USERS: end-user accounts for premium content
-- Tables: widget_users, widget_auth_codes, widget_sessions
-- ============================================

-- Widget users (end-users who create accounts to access premium content)
create table widget_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  auth_provider text not null default 'email' check (auth_provider in ('email', 'google')),
  google_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_active_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, email)
);

-- Magic codes for email authentication (6-digit, 10-min expiry)
create table widget_auth_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz default now()
);

-- Session tokens for authenticated widget users
create table widget_sessions (
  id uuid primary key default gen_random_uuid(),
  widget_user_id uuid not null references widget_users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_widget_users_workspace on widget_users(workspace_id);
create index idx_widget_users_email on widget_users(workspace_id, email);
create index idx_widget_auth_codes_lookup on widget_auth_codes(workspace_id, email, used);
create index idx_widget_sessions_token on widget_sessions(token);
create index idx_widget_sessions_user on widget_sessions(widget_user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table widget_users enable row level security;
alter table widget_auth_codes enable row level security;
alter table widget_sessions enable row level security;

-- widget_users: dashboard admins can view/manage users in their workspace
create policy "Workspace members can view widget users"
  on widget_users for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Workspace members can delete widget users"
  on widget_users for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- widget_users: public insert (widget creates accounts without dashboard auth)
create policy "Anyone can create widget user accounts"
  on widget_users for insert
  with check (true);

-- widget_users: public update for last_active_at
create policy "Anyone can update widget user activity"
  on widget_users for update
  using (true);

-- widget_auth_codes: public insert/select (widget sends and verifies codes)
create policy "Anyone can create auth codes"
  on widget_auth_codes for insert
  with check (true);

create policy "Anyone can read auth codes"
  on widget_auth_codes for select
  using (true);

create policy "Anyone can update auth codes"
  on widget_auth_codes for update
  using (true);

-- widget_sessions: public insert (created after successful auth)
create policy "Anyone can create sessions"
  on widget_sessions for insert
  with check (true);

-- widget_sessions: public select (widget verifies session tokens)
create policy "Anyone can verify sessions"
  on widget_sessions for select
  using (true);

-- widget_sessions: workspace members can delete sessions (admin action)
create policy "Workspace members can delete sessions"
  on widget_sessions for delete
  using (
    widget_user_id in (
      select wu.id from widget_users wu
      join workspace_members wm on wm.workspace_id = wu.workspace_id
      where wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );
