-- Migration: Remove auto-workspace creation from handle_new_user()
-- New users will create their first workspace via the onboarding page instead.

create or replace function handle_new_user()
returns trigger as $$
begin
  -- Create user record only — no default workspace
  insert into users (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );

  return new;
end;
$$ language plpgsql security definer;
