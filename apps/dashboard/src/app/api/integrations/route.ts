import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ============================================
// GET /api/integrations — Fetch integration status for the user's account
// ============================================

export async function GET() {
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

    const { data: account } = await supabase
      .from('accounts')
      .select('airtable_api_key')
      .eq('id', membership.account_id)
      .single()

    return NextResponse.json({
      accountId: membership.account_id,
      airtable: {
        connected: !!account?.airtable_api_key,
        // Only send a masked version of the key, never the full key
        keyHint: account?.airtable_api_key
          ? account.airtable_api_key.slice(0, 6) + '...' + account.airtable_api_key.slice(-4)
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

    const { data: membership } = await supabase
      .from('account_memberships')
      .select('account_id')
      .eq('user_id', authData.claims.sub)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 })
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
      .from('accounts')
      .update({
        airtable_api_key: airtableApiKey || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membership.account_id)

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
