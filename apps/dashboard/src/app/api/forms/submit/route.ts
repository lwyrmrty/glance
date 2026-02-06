import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// CORS headers — the widget submits from external sites
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Anonymous Supabase client (no auth — public widget submissions)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  try {
    const formData = await request.formData()

    const widgetId = formData.get('widget_id') as string | null
    const formName = formData.get('form_name') as string | null

    if (!widgetId || !formName) {
      return NextResponse.json(
        { error: 'Missing widget_id or form_name' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Fetch the widget to get account_id, form config, and webhook URL
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, account_id, button_style')
      .eq('id', widgetId)
      .single()

    if (widgetError || !widget) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find the matching form tab
    const tabs = ((widget.button_style as any)?.tabs ?? []) as any[]
    const formTab = tabs.find(
      (t: any) => t.type === 'Form' && t.name === formName
    )

    const formFields = (formTab?.form_fields ?? []) as { label: string; type: string }[]
    const webhookUrl = formTab?.form_webhook_url ?? ''
    const successMessage = formTab?.form_success_message ?? 'Thank you! Your submission has been received.'

    // ---- Collect field values and handle file uploads ----
    const data: Record<string, string> = {}
    const fileUrls: Record<string, string> = {}

    for (const field of formFields) {
      const value = formData.get(field.label)

      if (field.type === 'File Upload' && value instanceof File && value.size > 0) {
        // Upload file to form-uploads bucket
        const ext = value.name.split('.').pop() || 'bin'
        const storagePath = `${widgetId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('form-uploads')
          .upload(storagePath, value, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('form-uploads')
            .getPublicUrl(storagePath)
          fileUrls[field.label] = urlData.publicUrl
        }
        // Store original filename in data
        data[field.label] = value.name
      } else if (typeof value === 'string') {
        data[field.label] = value
      } else {
        data[field.label] = ''
      }
    }

    // ---- Insert into form_submissions ----
    const { error: insertError } = await supabase
      .from('form_submissions')
      .insert({
        account_id: widget.account_id,
        widget_id: widgetId,
        form_name: formName,
        data,
        file_urls: Object.keys(fileUrls).length > 0 ? fileUrls : {},
        webhook_url: webhookUrl || null,
        webhook_status: null,
      })

    if (insertError) {
      console.error('[Glance] Form submission insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500, headers: corsHeaders }
      )
    }

    // ---- Fire webhook (async, non-blocking for the response) ----
    let webhookStatus: number | null = null
    if (webhookUrl) {
      try {
        const webhookPayload = {
          widget_id: widgetId,
          form_name: formName,
          data,
          file_urls: fileUrls,
          submitted_at: new Date().toISOString(),
        }
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        })
        webhookStatus = webhookRes.status
      } catch (err) {
        console.error('[Glance] Webhook delivery error:', err)
        webhookStatus = 0
      }

      // Update the submission with webhook status
      // (best-effort — don't fail the response if this update fails)
      await supabase
        .from('form_submissions')
        .update({ webhook_status: webhookStatus })
        .eq('widget_id', widgetId)
        .eq('form_name', formName)
        .order('submitted_at', { ascending: false })
        .limit(1)
    }

    return NextResponse.json(
      { success: true, success_message: successMessage },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[Glance] Form submission error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
