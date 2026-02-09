-- ============================================
-- MULTIPLE AIRTABLE KEYS PER WORKSPACE
-- Migrate from workspaces.airtable_api_key to
-- a dedicated workspace_airtable_keys table.
-- ============================================

-- Step 1: Create the new table
create table workspace_airtable_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null default '',            -- user label, e.g. "Marketing Base"
  api_key text not null,                    -- the Personal Access Token
  key_hint text not null default '',        -- masked version, e.g. "pat123...abcd"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_workspace_airtable_keys_workspace on workspace_airtable_keys(workspace_id);

-- Step 2: RLS
alter table workspace_airtable_keys enable row level security;

create policy "Workspace members can view airtable keys"
  on workspace_airtable_keys for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Owners and admins can create airtable keys"
  on workspace_airtable_keys for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can update airtable keys"
  on workspace_airtable_keys for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can delete airtable keys"
  on workspace_airtable_keys for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Step 3: Migrate existing keys into the new table
-- and store the new key id in each airtable knowledge source config
do $$
declare
  ws record;
  new_key_id uuid;
begin
  for ws in
    select id, airtable_api_key
    from workspaces
    where airtable_api_key is not null and airtable_api_key <> ''
  loop
    -- Insert the key into the new table
    insert into workspace_airtable_keys (workspace_id, name, api_key, key_hint)
    values (
      ws.id,
      'Airtable',
      ws.airtable_api_key,
      left(ws.airtable_api_key, 6) || '...' || right(ws.airtable_api_key, 4)
    )
    returning id into new_key_id;

    -- Update all airtable knowledge sources in this workspace
    -- to store the key id in their config
    update knowledge_sources
    set config = config || jsonb_build_object('airtableKeyId', new_key_id::text)
    where workspace_id = ws.id
      and type = 'airtable_table';
  end loop;
end;
$$;

-- Step 4: Drop the old column
alter table workspaces drop column if exists airtable_api_key;
