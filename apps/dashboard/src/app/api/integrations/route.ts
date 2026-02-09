import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

// ============================================
// GET /api/integrations — Fetch integration status for the user's workspace
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeWorkspace = await getActiveWorkspace(supabase, authData.claims.sub)
    if (!activeWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    // Check how many Airtable keys exist
    const { count } = await supabase
      .from('workspace_airtable_keys')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspace.workspace_id)

    return NextResponse.json({
      workspaceId: activeWorkspace.workspace_id,
      airtable: {
        connected: (count ?? 0) > 0,
        keyCount: count ?? 0,
      },
    })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
