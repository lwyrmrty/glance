-- Add comments column to knowledge_sources
-- Used as routing hints for chat to understand when/how to use each source
alter table knowledge_sources add column if not exists comments text default '';
