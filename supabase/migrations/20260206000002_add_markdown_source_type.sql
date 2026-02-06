-- Add 'markdown' to the allowed knowledge source types
alter table knowledge_sources
  drop constraint knowledge_sources_type_check;

alter table knowledge_sources
  add constraint knowledge_sources_type_check
  check (type in ('google_doc', 'google_sheet', 'airtable_base', 'airtable_table', 'text', 'url', 'markdown'));
