import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// GET /api/airtable?action=bases&key_id=xxx — List bases the key has access to
// GET /api/airtable?action=tables&key_id=xxx&baseId=xxx — List tables in a base
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('key_id')
    const action = searchParams.get('action')

    if (!keyId) {
      return NextResponse.json(
        { error: 'Missing key_id parameter. Select an Airtable key first.' },
        { status: 400 }
      )
    }

    // Look up the key (RLS ensures only workspace members can read it)
    const { data: keyData, error: keyError } = await supabase
      .from('workspace_airtable_keys')
      .select('api_key')
      .eq('id', keyId)
      .single()

    if (keyError || !keyData?.api_key) {
      return NextResponse.json(
        { error: 'Airtable key not found. It may have been deleted.' },
        { status: 404 }
      )
    }

    const apiKey = keyData.api_key

    if (action === 'bases') {
      // List all bases
      const response = await fetch('https://api.airtable.com/v0/meta/bases', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        const errText = await response.text()
        return NextResponse.json(
          { error: `Airtable API error (${response.status}): ${errText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      const bases = (data.bases || []).map((b: { id: string; name: string }) => ({
        id: b.id,
        name: b.name,
      }))

      return NextResponse.json({ bases })
    }

    if (action === 'tables') {
      const baseId = searchParams.get('baseId')
      if (!baseId) {
        return NextResponse.json({ error: 'Missing baseId parameter' }, { status: 400 })
      }

      // List tables in a base
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        const errText = await response.text()
        return NextResponse.json(
          { error: `Airtable API error (${response.status}): ${errText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      const tables = (data.tables || []).map((t: { id: string; name: string; fields?: { id: string; name: string; type: string }[]; views?: { id: string; name: string; type: string }[] }) => ({
        id: t.id,
        name: t.name,
        fields: (t.fields || []).map(f => ({ id: f.id, name: f.name, type: f.type })),
        views: (t.views || []).map(v => ({ id: v.id, name: v.name, type: v.type })),
      }))

      return NextResponse.json({ tables })
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=bases or ?action=tables&baseId=xxx' }, { status: 400 })
  } catch (error) {
    console.error('Airtable API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
