import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'

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

    const { data: wsData } = await supabase
      .from('workspaces')
      .select('airtable_api_key')
      .eq('id', activeWorkspace.workspace_id)
      .single()

    return NextResponse.json({
      workspaceId: activeWorkspace.workspace_id,
      airtable: {
        connected: !!wsData?.airtable_api_key,
        // Only send a masked version of the key, never the full key
        keyHint: wsData?.airtable_api_key
          ? wsData.airtable_api_key.slice(0, 6) + '...' + wsData.airtable_api_key.slice(-4)
          : null,
      },
    })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/integrations — Update integration keys
// ============================================

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { airtableApiKey } = body

    if (airtableApiKey === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate the key by trying to list bases
    if (airtableApiKey) {
      const testResponse = await fetch('https://api.airtable.com/v0/meta/bases', {
        headers: { Authorization: `Bearer ${airtableApiKey}` },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Invalid Airtable API key. Please check your Personal Access Token.' },
          { status: 400 }
        )
      }
    }

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        airtable_api_key: airtableApiKey || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeWorkspace.workspace_id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      airtable: {
        connected: !!airtableApiKey,
        keyHint: airtableApiKey
          ? airtableApiKey.slice(0, 6) + '...' + airtableApiKey.slice(-4)
          : null,
      },
    })
  } catch (error) {
    console.error('Integrations PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
