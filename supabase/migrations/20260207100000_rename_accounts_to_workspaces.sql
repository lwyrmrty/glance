-- ============================================
-- RENAME: accounts -> workspaces, account_memberships -> workspace_members
-- All account_id columns -> workspace_id
-- ============================================

-- Step 1: Drop ALL existing RLS policies that reference old names
-- (We'll recreate them with new names at the end)

-- Policies on accounts
drop policy if exists "Users can view their accounts" on accounts;
drop policy if exists "Users can update their accounts" on accounts;

-- Policies on account_memberships
drop policy if exists "Users can view their memberships" on account_memberships;

-- Policies on widgets
drop policy if exists "Users can view widgets in their accounts" on widgets;
drop policy if exists "Users can create widgets in their accounts" on widgets;
drop policy if exists "Users can update widgets in their accounts" on widgets;
drop policy if exists "Users can delete widgets in their accounts" on widgets;

-- Policies on knowledge_sources
drop policy if exists "Users can view knowledge sources in their accounts" on knowledge_sources;
drop policy if exists "Users can create knowledge sources in their accounts" on knowledge_sources;
drop policy if exists "Users can update knowledge sources in their accounts" on knowledge_sources;
drop policy if exists "Users can delete knowledge sources in their accounts" on knowledge_sources;

-- Policies on knowledge_chunks
drop policy if exists "Users can view chunks for their knowledge sources" on knowledge_chunks;
drop policy if exists "Users can create chunks for their knowledge sources" on knowledge_chunks;
drop policy if exists "Users can delete chunks for their knowledge sources" on knowledge_chunks;

-- Policies on form_submissions
drop policy if exists "Account members can view form submissions" on form_submissions;
drop policy if exists "Owners and admins can delete form submissions" on form_submissions;
-- Keep "Anyone can submit forms" — it doesn't reference account names

-- Step 2: Rename tables
alter table accounts rename to workspaces;
alter table account_memberships rename to workspace_members;

-- Step 3: Rename account_id columns to workspace_id
alter table workspace_members rename column account_id to workspace_id;
alter table widgets rename column account_id to workspace_id;
alter table knowledge_sources rename column account_id to workspace_id;
alter table form_submissions rename column account_id to workspace_id;

-- Step 4: Rename the unique constraint on workspace_members
-- (Postgres renames the constraint automatically when columns rename,
--  but the constraint name still says "account". Let's fix for clarity.)
alter index if exists account_memberships_account_id_user_id_key
  rename to workspace_members_workspace_id_user_id_key;

-- Rename the index on form_submissions
alter index if exists idx_form_submissions_account_form
  rename to idx_form_submissions_workspace_form;

-- Step 5: Update the handle_new_user() trigger function
create or replace function handle_new_user()
returns trigger as $$
declare
  new_workspace_id uuid;
begin
  -- Create user record
  insert into users (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );

  -- Create default workspace
  insert into workspaces (id, name)
  values (gen_random_uuid(), coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)) || '''s Workspace')
  returning id into new_workspace_id;

  -- Make the user the owner
  insert into workspace_members (workspace_id, user_id, role, accepted_at)
  values (new_workspace_id, new.id, 'owner', now());

  return new;
end;
$$ language plpgsql security definer;

-- Step 6: Recreate RLS policies with new names

-- Workspaces (was accounts)
create policy "Users can view their workspaces"
  on workspaces for select
  using (
    id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can update their workspaces"
  on workspaces for update
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Workspace members (was account_memberships)
create policy "Users can view their memberships"
  on workspace_members for select
  using (user_id = auth.uid());

-- Widgets
create policy "Users can view widgets in their workspaces"
  on widgets for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can create widgets in their workspaces"
  on widgets for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can update widgets in their workspaces"
  on widgets for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Users can delete widgets in their workspaces"
  on widgets for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Knowledge sources
create policy "Users can view knowledge sources in their workspaces"
  on knowledge_sources for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can create knowledge sources in their workspaces"
  on knowledge_sources for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can update knowledge sources in their workspaces"
  on knowledge_sources for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Users can delete knowledge sources in their workspaces"
  on knowledge_sources for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Knowledge chunks (references knowledge_sources which now uses workspace_id)
create policy "Users can view chunks for their knowledge sources"
  on knowledge_chunks for select
  using (
    source_id in (
      select ks.id from knowledge_sources ks
      join workspace_members wm on wm.workspace_id = ks.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "Users can create chunks for their knowledge sources"
  on knowledge_chunks for insert
  with check (
    source_id in (
      select ks.id from knowledge_sources ks
      join workspace_members wm on wm.workspace_id = ks.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "Users can delete chunks for their knowledge sources"
  on knowledge_chunks for delete
  using (
    source_id in (
      select ks.id from knowledge_sources ks
      join workspace_members wm on wm.workspace_id = ks.workspace_id
      where wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- Form submissions
create policy "Workspace members can view form submissions"
  on form_submissions for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Owners and admins can delete form submissions"
  on form_submissions for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );
