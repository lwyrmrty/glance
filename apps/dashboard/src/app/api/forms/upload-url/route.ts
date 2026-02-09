import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { widget_id, file_name, content_type, file_size } = body as {
      widget_id?: string
      file_name?: string
      content_type?: string
      file_size?: number
    }

    if (!widget_id || !file_name) {
      return NextResponse.json(
        { error: 'Missing widget_id or file_name' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (file_size && file_size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate widget exists
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id')
      .eq('id', widget_id)
      .single()

    if (widgetError || !widget) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Build storage path
    const ext = file_name.split('.').pop() || 'bin'
    const storagePath = `${widget_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // Create signed upload URL (valid for 2 minutes)
    const { data, error } = await supabase.storage
      .from('form-uploads')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('[Glance] Failed to create signed upload URL:', error)
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Get the public URL for this path
    const { data: publicUrlData } = supabase.storage
      .from('form-uploads')
      .getPublicUrl(storagePath)

    return NextResponse.json(
      {
        signed_url: data.signedUrl,
        token: data.token,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
      },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[Glance] Upload URL error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
