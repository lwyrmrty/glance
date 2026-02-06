-- ============================================
-- CORE TABLES: accounts, users, memberships, widgets
-- ============================================

-- Accounts (top-level entity — contains widgets)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  airtable_api_key text,
  google_oauth_token jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users (people who log into the Glance dashboard)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Account memberships (many-to-many: users <-> accounts)
create table account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(account_id, user_id)
);

-- Widgets (each account can have multiple — this is a "Glance")
create table widgets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  logo_url text,                     -- logo/icon for the Glance
  domain text,                       -- authorized domain for embedding
  theme_color text default '#7C3AED',
  button_style jsonb default '{}',
  hash_prefix text default 'glance',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AUTO-CREATE USER + ACCOUNT ON SIGNUP
-- ============================================

-- When a new user signs up via Supabase Auth, automatically:
-- 1. Create a row in our users table
-- 2. Create a default account for them
-- 3. Make them the owner of that account
create or replace function handle_new_user()
returns trigger as $$
declare
  new_account_id uuid;
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

  -- Create default account
  insert into accounts (id, name)
  values (gen_random_uuid(), coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)) || '''s Account')
  returning id into new_account_id;

  -- Make the user the owner
  insert into account_memberships (account_id, user_id, role, accepted_at)
  values (new_account_id, new.id, 'owner', now());

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table accounts enable row level security;
alter table users enable row level security;
alter table account_memberships enable row level security;
alter table widgets enable row level security;

-- Users can read/update their own record
create policy "Users can view own profile"
  on users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update using (auth.uid() = id);

-- Account memberships: users can see memberships for accounts they belong to
create policy "Users can view their memberships"
  on account_memberships for select
  using (user_id = auth.uid());

-- Accounts: users can view/update accounts they're a member of
create policy "Users can view their accounts"
  on accounts for select
  using (
    id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

create policy "Users can update their accounts"
  on accounts for update
  using (
    id in (
      select account_id from account_memberships 
      where user_id = auth.uid() 
      and role in ('owner', 'admin')
    )
  );

-- Widgets: users can CRUD widgets for accounts they belong to
create policy "Users can view widgets in their accounts"
  on widgets for select
  using (
    account_id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

create policy "Users can create widgets in their accounts"
  on widgets for insert
  with check (
    account_id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

create policy "Users can update widgets in their accounts"
  on widgets for update
  using (
    account_id in (
      select account_id from account_memberships 
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Users can delete widgets in their accounts"
  on widgets for delete
  using (
    account_id in (
      select account_id from account_memberships 
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- ============================================
-- STORAGE BUCKET FOR LOGOS
-- ============================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true);

create policy "Anyone can view logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Authenticated users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Authenticated users can update their logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'authenticated');
