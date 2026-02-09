import { createAdminClient } from '@/lib/supabase/admin'
import { fireWebhooks } from '@/lib/webhooks'
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
  const supabase = createAdminClient()

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

    // Fetch the widget to get workspace_id, form config, and webhook URL
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, workspace_id, button_style')
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

    // ---- Check for logged-in user via session token ----
    const sessionToken = formData.get('_glance_session_token') as string | null
    let loggedInUser: { email: string; first_name: string; last_name: string } | null = null

    if (sessionToken) {
      const { data: session } = await supabase
        .from('widget_sessions')
        .select('widget_user_id, expires_at')
        .eq('token', sessionToken)
        .single()

      if (session && new Date(session.expires_at) > new Date()) {
        const { data: user } = await supabase
          .from('widget_users')
          .select('email, first_name, last_name, workspace_id')
          .eq('id', session.widget_user_id)
          .single()

        if (user && user.workspace_id === widget.workspace_id) {
          loggedInUser = {
            email: user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
          }
        }
      }
    }

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

    // ---- Merge logged-in user data into submission ----
    if (loggedInUser) {
      data['_user_email'] = loggedInUser.email
      data['_user_first_name'] = loggedInUser.first_name
      data['_user_last_name'] = loggedInUser.last_name
    }

    // ---- Fire webhook BEFORE insert (flat Zapier-compatible payload) ----
    let webhookStatus: number | null = null
    if (webhookUrl) {
      try {
        // Build flat payload — form fields at top level with snake_case keys
        const webhookPayload: Record<string, string> = {
          event: 'form_submission',
          form_name: formName,
          widget_id: widgetId,
          submitted_at: new Date().toISOString(),
        }

        // Add logged-in user data to webhook payload
        if (loggedInUser) {
          webhookPayload['user_email'] = loggedInUser.email
          webhookPayload['user_first_name'] = loggedInUser.first_name
          webhookPayload['user_last_name'] = loggedInUser.last_name
        }

        for (const field of formFields) {
          const key = field.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
          webhookPayload[key] = data[field.label] ?? ''
          // Add companion _url key for file fields
          if (fileUrls[field.label]) {
            webhookPayload[`${key}_url`] = fileUrls[field.label]
          }
        }

        console.log('[Glance] Firing webhook to:', webhookUrl)
        console.log('[Glance] Webhook payload:', JSON.stringify(webhookPayload))
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        })
        webhookStatus = webhookRes.status
        const webhookBody = await webhookRes.text().catch(() => '')
        console.log('[Glance] Webhook response status:', webhookStatus)
        if (webhookStatus >= 400) {
          console.log('[Glance] Webhook response body:', webhookBody)
        }
      } catch (err: any) {
        console.error('[Glance] Webhook delivery error:', err?.message ?? err)
        webhookStatus = 0
      }
    }

    // ---- Insert into form_submissions (with webhook status included) ----
    const { error: insertError } = await supabase
      .from('form_submissions')
      .insert({
        workspace_id: widget.workspace_id,
        widget_id: widgetId,
        form_name: formName,
        data,
        file_urls: Object.keys(fileUrls).length > 0 ? fileUrls : {},
        webhook_url: webhookUrl || null,
        webhook_status: webhookStatus,
      })

    if (insertError) {
      console.error('[Glance] Form submission insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Fire workspace-level form_submitted webhooks (non-blocking)
    const webhookFormPayload: Record<string, unknown> = {
      form_name: formName,
      widget_id: widgetId,
      data,
    }
    if (Object.keys(fileUrls).length > 0) {
      webhookFormPayload.file_urls = fileUrls
    }
    if (loggedInUser) {
      webhookFormPayload.user_email = loggedInUser.email
      webhookFormPayload.user_first_name = loggedInUser.first_name
      webhookFormPayload.user_last_name = loggedInUser.last_name
    }
    fireWebhooks(widget.workspace_id, 'form_submitted', webhookFormPayload)

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
