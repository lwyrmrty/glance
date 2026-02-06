-- ============================================
-- KNOWLEDGE TABLES: sources + chunks with pgvector
-- ============================================

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Knowledge Sources (account-level, reusable across widgets)
create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null default '',
  type text not null check (type in ('google_doc', 'google_sheet', 'airtable_base', 'airtable_table', 'text', 'url')),
  config jsonb default '{}',           -- source-specific config (share link, doc ID, etc.)
  content text,                         -- raw fetched content
  sync_status text not null default 'pending' check (sync_status in ('pending', 'syncing', 'synced', 'error')),
  last_synced_at timestamptz,
  chunk_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Knowledge Chunks (chunked + embedded content for RAG)
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade,
  content text not null,
  metadata jsonb default '{}',          -- source doc, chunk index, etc.
  embedding vector(1536),               -- OpenAI text-embedding-3-small
  created_at timestamptz default now()
);

-- Indexes
create index idx_chunks_source on knowledge_chunks(source_id);
create index idx_chunks_embedding on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;

-- Knowledge sources: users can CRUD sources for accounts they belong to
create policy "Users can view knowledge sources in their accounts"
  on knowledge_sources for select
  using (
    account_id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

create policy "Users can create knowledge sources in their accounts"
  on knowledge_sources for insert
  with check (
    account_id in (
      select account_id from account_memberships where user_id = auth.uid()
    )
  );

create policy "Users can update knowledge sources in their accounts"
  on knowledge_sources for update
  using (
    account_id in (
      select account_id from account_memberships
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Users can delete knowledge sources in their accounts"
  on knowledge_sources for delete
  using (
    account_id in (
      select account_id from account_memberships
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Knowledge chunks: accessible if user can access the parent source
create policy "Users can view chunks for their knowledge sources"
  on knowledge_chunks for select
  using (
    source_id in (
      select ks.id from knowledge_sources ks
      join account_memberships am on am.account_id = ks.account_id
      where am.user_id = auth.uid()
    )
  );

create policy "Users can create chunks for their knowledge sources"
  on knowledge_chunks for insert
  with check (
    source_id in (
      select ks.id from knowledge_sources ks
      join account_memberships am on am.account_id = ks.account_id
      where am.user_id = auth.uid()
    )
  );

create policy "Users can delete chunks for their knowledge sources"
  on knowledge_chunks for delete
  using (
    source_id in (
      select ks.id from knowledge_sources ks
      join account_memberships am on am.account_id = ks.account_id
      where am.user_id = auth.uid()
      and am.role in ('owner', 'admin')
    )
  );

-- ============================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================

-- Function to search chunks by embedding similarity
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  source_ids uuid[],
  match_count int default 10,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.source_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.source_id = any(source_ids)
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;
