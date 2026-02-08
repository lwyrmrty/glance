import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// CORS headers — the widget sends chat data from external sites
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const {
      action,
      widget_id,
      session_id,
      widget_user_id,
      tab_name,
      chat_session_id,
      messages,
    } = body as {
      action: 'create_session' | 'add_messages'
      widget_id?: string
      session_id?: string
      widget_user_id?: string | null
      tab_name?: string
      chat_session_id?: string
      messages?: Array<{ role: string; content: string }>
    }

    // ---- Create a new chat session ----
    if (action === 'create_session') {
      if (!widget_id) {
        return NextResponse.json(
          { error: 'Missing widget_id' },
          { status: 400, headers: corsHeaders }
        )
      }

      const { data: chatSession, error: createError } = await supabase
        .from('widget_chat_sessions')
        .insert({
          widget_id,
          widget_user_id: widget_user_id || null,
          tab_name: tab_name || null,
          session_id: session_id || null,
          message_count: 0,
        })
        .select('id')
        .single()

      if (createError || !chatSession) {
        console.error('[Glance] Chat session create error:', createError)
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, chat_session_id: chatSession.id },
        { headers: corsHeaders }
      )
    }

    // ---- Add messages to an existing chat session ----
    if (action === 'add_messages') {
      if (!chat_session_id || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
          { error: 'Missing chat_session_id or messages' },
          { status: 400, headers: corsHeaders }
        )
      }

      const messageRows = messages.map((msg) => ({
        chat_session_id,
        role: msg.role,
        content: msg.content,
      }))

      const { error: insertError } = await supabase
        .from('widget_chat_messages')
        .insert(messageRows)

      if (insertError) {
        console.error('[Glance] Chat messages insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to save messages' },
          { status: 500, headers: corsHeaders }
        )
      }

      // Increment message_count atomically
      const { error: countError } = await supabase.rpc('increment_chat_message_count', {
        p_chat_session_id: chat_session_id,
        p_count: messages.length,
      })

      if (countError) {
        console.error('[Glance] Chat message count update error:', countError)
      }

      return NextResponse.json(
        { success: true },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create_session" or "add_messages".' },
      { status: 400, headers: corsHeaders }
    )
  } catch (err) {
    console.error('[Glance] Widget chats error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
