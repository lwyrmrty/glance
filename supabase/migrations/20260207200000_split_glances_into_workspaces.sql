-- ============================================
-- RLS: Allow authenticated users to create workspaces and memberships
-- ============================================

-- Allow any authenticated user to create a workspace
create policy "Authenticated users can create workspaces"
  on workspaces for insert
  with check (auth.role() = 'authenticated');

-- Allow workspace owners to insert memberships (for invites, etc.)
create policy "Workspace owners can add members"
  on workspace_members for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'owner'
    )
    OR user_id = auth.uid()  -- users can accept their own membership
  );

-- ============================================
-- SPLIT: Each existing Glance gets its own Workspace
-- Reassigns widgets + knowledge sources accordingly
-- ============================================

DO $$
DECLARE
  w RECORD;        -- widget loop variable
  m RECORD;        -- membership loop variable
  ks RECORD;       -- knowledge source loop variable
  new_ws_id uuid;  -- new workspace id
  old_ws_id uuid;  -- original workspace id
  tab_obj jsonb;   -- individual tab from button_style
  ks_id text;      -- knowledge source id extracted from tab
  source_moved boolean;
BEGIN
  -- Loop through all widgets grouped by their current workspace
  FOR w IN
    SELECT id, workspace_id, name, button_style
    FROM widgets
    ORDER BY created_at ASC
  LOOP
    old_ws_id := w.workspace_id;

    -- Create a new workspace named after the Glance
    INSERT INTO workspaces (id, name)
    VALUES (gen_random_uuid(), w.name)
    RETURNING id INTO new_ws_id;

    -- Copy all memberships from the old workspace to the new one
    FOR m IN
      SELECT user_id, role, accepted_at
      FROM workspace_members
      WHERE workspace_id = old_ws_id
    LOOP
      INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
      VALUES (new_ws_id, m.user_id, m.role, m.accepted_at)
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END LOOP;

    -- Copy workspace settings (airtable key, etc.) from old workspace
    UPDATE workspaces
    SET airtable_api_key = (SELECT airtable_api_key FROM workspaces WHERE id = old_ws_id),
        google_oauth_token = (SELECT google_oauth_token FROM workspaces WHERE id = old_ws_id)
    WHERE id = new_ws_id;

    -- Move the widget to the new workspace
    UPDATE widgets SET workspace_id = new_ws_id WHERE id = w.id;

    -- Move knowledge sources that are referenced by this widget's tabs
    -- Parse button_style -> tabs -> each tab -> knowledge_sources array
    IF w.button_style IS NOT NULL AND w.button_style->'tabs' IS NOT NULL THEN
      FOR tab_obj IN SELECT jsonb_array_elements(w.button_style->'tabs')
      LOOP
        IF tab_obj->'knowledge_sources' IS NOT NULL THEN
          FOR ks_id IN SELECT jsonb_array_elements_text(tab_obj->'knowledge_sources')
          LOOP
            -- Only move if valid UUID and still in the old workspace
            IF ks_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
              -- Check if this source is still in the old workspace
              SELECT EXISTS(
                SELECT 1 FROM knowledge_sources
                WHERE id = ks_id::uuid AND workspace_id = old_ws_id
              ) INTO source_moved;

              IF source_moved THEN
                -- Move the knowledge source to the new workspace
                UPDATE knowledge_sources
                SET workspace_id = new_ws_id
                WHERE id = ks_id::uuid AND workspace_id = old_ws_id;
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    -- Move any form_submissions for this widget to the new workspace
    UPDATE form_submissions SET workspace_id = new_ws_id WHERE widget_id = w.id;

  END LOOP;

  -- Move any remaining unassigned knowledge sources to the first new workspace
  -- (sources not referenced by any tab but still in the old workspace)
  FOR ks IN
    SELECT DISTINCT ks2.workspace_id AS old_ws
    FROM knowledge_sources ks2
    WHERE NOT EXISTS (
      SELECT 1 FROM widgets w2 WHERE w2.workspace_id = ks2.workspace_id
    )
  LOOP
    -- Find the first workspace that has widgets (to assign orphans to)
    UPDATE knowledge_sources
    SET workspace_id = (
      SELECT workspace_id FROM widgets ORDER BY created_at ASC LIMIT 1
    )
    WHERE workspace_id = ks.old_ws;
  END LOOP;

  -- Clean up: delete old workspaces that no longer have any widgets
  DELETE FROM workspace_members
  WHERE workspace_id IN (
    SELECT ws.id FROM workspaces ws
    WHERE NOT EXISTS (SELECT 1 FROM widgets w2 WHERE w2.workspace_id = ws.id)
  );

  DELETE FROM workspaces
  WHERE NOT EXISTS (SELECT 1 FROM widgets w2 WHERE w2.workspace_id = workspaces.id);

END $$;
