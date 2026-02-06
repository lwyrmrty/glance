import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// GET /api/airtable?action=bases — List bases the user has access to
// GET /api/airtable?action=tables&baseId=xxx — List tables in a base
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getClaims()
    if (authError || !authData?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('account_memberships')
      .select('account_id')
      .eq('user_id', authData.claims.sub)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 })
    }

    // Get the stored Airtable API key
    const { data: account } = await supabase
      .from('accounts')
      .select('airtable_api_key')
      .eq('id', membership.account_id)
      .single()

    if (!account?.airtable_api_key) {
      return NextResponse.json(
        { error: 'Airtable is not connected. Add your API key in Integrations.' },
        { status: 400 }
      )
    }

    const apiKey = account.airtable_api_key
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

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
      const tables = (data.tables || []).map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
      }))

      return NextResponse.json({ tables })
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=bases or ?action=tables&baseId=xxx' }, { status: 400 })
  } catch (error) {
    console.error('Airtable API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
