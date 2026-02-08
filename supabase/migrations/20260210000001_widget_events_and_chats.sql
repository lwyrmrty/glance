-- ============================================
-- WIDGET EVENTS + CHAT PERSISTENCE
-- Tables: widget_events, widget_chat_sessions, widget_chat_messages
-- ============================================

-- Widget events (click tracking, tab views, form submissions, etc.)
create table widget_events (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references widgets(id) on delete cascade,
  widget_user_id uuid references widget_users(id) on delete set null,
  session_id text not null,
  event_type text not null check (event_type in (
    'widget_opened', 'tab_viewed', 'form_submitted', 'link_clicked', 'chat_started'
  )),
  event_data jsonb not null default '{}',
  page_url text,
  created_at timestamptz default now()
);

-- Chat sessions (one per conversation thread)
create table widget_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references widgets(id) on delete cascade,
  widget_user_id uuid references widget_users(id) on delete set null,
  tab_name text,
  session_id text,
  message_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat messages (individual messages within a chat session)
create table widget_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references widget_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_widget_events_widget_user on widget_events(widget_id, widget_user_id, created_at desc);
create index idx_widget_events_session on widget_events(session_id, created_at);
create index idx_widget_chat_sessions_widget on widget_chat_sessions(widget_id, widget_user_id, created_at desc);
create index idx_widget_chat_messages_session on widget_chat_messages(chat_session_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table widget_events enable row level security;
alter table widget_chat_sessions enable row level security;
alter table widget_chat_messages enable row level security;

-- widget_events: public insert (widget fires events without dashboard auth)
create policy "Anyone can insert widget events"
  on widget_events for insert
  with check (true);

-- widget_events: dashboard members can view events for their widgets
create policy "Workspace members can view widget events"
  on widget_events for select
  using (
    widget_id in (
      select w.id from widgets w
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

-- widget_chat_sessions: public insert (widget creates chat sessions)
create policy "Anyone can create chat sessions"
  on widget_chat_sessions for insert
  with check (true);

-- widget_chat_sessions: public update (widget increments message_count)
create policy "Anyone can update chat sessions"
  on widget_chat_sessions for update
  using (true);

-- widget_chat_sessions: dashboard members can view
create policy "Workspace members can view chat sessions"
  on widget_chat_sessions for select
  using (
    widget_id in (
      select w.id from widgets w
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

-- widget_chat_messages: public insert (widget saves messages)
create policy "Anyone can create chat messages"
  on widget_chat_messages for insert
  with check (true);

-- widget_chat_messages: dashboard members can view via chat session
create policy "Workspace members can view chat messages"
  on widget_chat_messages for select
  using (
    chat_session_id in (
      select cs.id from widget_chat_sessions cs
      join widgets w on w.id = cs.widget_id
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

-- ============================================
-- RPC: increment chat message count atomically
-- ============================================

create or replace function increment_chat_message_count(
  p_chat_session_id uuid,
  p_count int default 1
)
returns void
language sql
security definer
as $$
  update widget_chat_sessions
  set message_count = message_count + p_count,
      updated_at = now()
  where id = p_chat_session_id;
$$;
