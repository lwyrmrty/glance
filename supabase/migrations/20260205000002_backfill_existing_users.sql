-- Backfill: create user, account, and membership records for any
-- auth.users that signed up before the trigger was installed.

INSERT INTO users (id, email, first_name, last_name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', '')
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id);

-- For each backfilled user, create a default account + owner membership
DO $$
DECLARE
  u RECORD;
  new_account_id uuid;
BEGIN
  FOR u IN 
    SELECT users.id, users.email, users.first_name 
    FROM users 
    WHERE NOT EXISTS (
      SELECT 1 FROM account_memberships am WHERE am.user_id = users.id
    )
  LOOP
    INSERT INTO accounts (name)
    VALUES (COALESCE(NULLIF(u.first_name, ''), split_part(u.email, '@', 1)) || '''s Account')
    RETURNING id INTO new_account_id;

    INSERT INTO account_memberships (account_id, user_id, role, accepted_at)
    VALUES (new_account_id, u.id, 'owner', now());
  END LOOP;
END $$;
