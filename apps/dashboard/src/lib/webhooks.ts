import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Valid event types that can trigger webhooks.
 */
export type WebhookEventType = 'account_created' | 'form_submitted' | 'chat_started'

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  account_created: 'Account Created',
  form_submitted: 'Form Submitted',
  chat_started: 'Chat Started',
}

/**
 * Fire all active webhooks for a workspace that match the given event type.
 *
 * This is a fire-and-forget helper — it logs errors but never throws,
 * so it won't break the calling API route.
 *
 * @param workspaceId  The workspace owning the webhooks
 * @param eventType    Which event occurred
 * @param payload      Flat, JSON-serialisable data to send
 */
export async function fireWebhooks(
  workspaceId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>
) {
  try {
    const supabase = createAdminClient()

    // Fetch all active webhooks for this workspace that listen to this event
    const { data: webhooks, error } = await supabase
      .from('workspace_webhooks')
      .select('id, url, name')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .contains('event_types', [eventType])

    if (error || !webhooks || webhooks.length === 0) {
      return
    }

    // Build the webhook body — Zapier-friendly flat payload
    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      workspace_id: workspaceId,
      ...payload,
    })

    // Fire all webhooks concurrently (don't await — fire and forget)
    const promises = webhooks.map(async (wh) => {
      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout
        })
        console.log(`[Glance] Webhook "${wh.name}" (${wh.id}) fired to ${wh.url} — status ${res.status}`)
      } catch (err: any) {
        console.error(`[Glance] Webhook "${wh.name}" (${wh.id}) failed:`, err?.message ?? err)
      }
    })

    // Wait for all to settle (we don't want to lose log output)
    await Promise.allSettled(promises)
  } catch (err) {
    console.error('[Glance] fireWebhooks error:', err)
  }
}
