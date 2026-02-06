-- ============================================
-- FORM SUBMISSIONS: table, storage, RLS
-- ============================================

-- Form submissions (account-level, filterable by form_name)
create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  widget_id uuid references widgets(id) on delete cascade,
  form_name text not null,                -- matches tab name, used for filtering
  data jsonb not null default '{}',       -- flat map of field label -> value
  file_urls jsonb default '{}',           -- flat map of field label -> public storage URL
  webhook_url text,                       -- snapshot of webhook URL at time of submission
  webhook_status int,                     -- HTTP response code (null if no webhook)
  submitted_at timestamptz default now()
);

-- Index for efficient filtering in the dashboard viewer
create index idx_form_submissions_account_form on form_submissions(account_id, form_name);
create index idx_form_submissions_widget on form_submissions(widget_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table form_submissions enable row level security;

-- Account members can view their account's submissions
create policy "Account members can view form submissions"
  on form_submissions for select
  using (
    account_id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

-- Public insert (the widget is embedded on external sites, no auth)
create policy "Anyone can submit forms"
  on form_submissions for insert
  with check (true);

-- Owners/admins can delete submissions
create policy "Owners and admins can delete form submissions"
  on form_submissions for delete
  using (
    account_id in (
      select account_id from account_memberships
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- ============================================
-- STORAGE BUCKET FOR FORM FILE UPLOADS
-- ============================================

insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', true);

-- Anyone can view uploaded form files
create policy "Anyone can view form uploads"
  on storage.objects for select
  using (bucket_id = 'form-uploads');

-- Anyone can upload form files (widget submits without auth)
create policy "Anyone can upload form files"
  on storage.objects for insert
  with check (bucket_id = 'form-uploads');
