# Glance Analytics — Tracking Check & Debugging Guide

## How Analytics Flow Works

1. **Widget** (`public/widget.js`) tracks events via `_glanceTrack(type, data)`:
   - `tab_viewed` — when a tab is shown (including on load)
   - `widget_opened` — when the user opens the widget
   - `form_submitted` — when a form is submitted
   - `chat_started` — when the first message is sent in AI Chat
   - `link_clicked` — when a content link is clicked

2. **Flush** — events are queued and sent to `/api/widget-events` via `navigator.sendBeacon`:
   - Every 30 seconds (interval)
   - On `beforeunload` (tab close/navigation)
   - **Now:** 2 seconds after the last event (reduces loss on quick bounces)

3. **Storage** — events go into Supabase `widget_events` (widget_id, session_id, event_type, etc.)

4. **Dashboard** — analytics API fetches events for widgets in the workspace and aggregates them.

---

## Why You Might See Zero Interactions

### 1. **Embed code uses wrong script URL** (most likely)

The script **must** load from your Glance backend domain. The API base is derived from the script’s `src`:

- **Correct:** `<script src="https://your-glance-domain.com/widget.js" data-widget-id="WIDGET_UUID"></script>`
- **Incorrect:** `<script src="/widget.js" data-widget-id="WIDGET_UUID"></script>`  
  → Loads from the host site (e.g. blackflag.com), config fetch 404s, widget never initializes, `_glanceWidgetId` stays null, no events are sent.

**Check:** On Black Flag’s site, inspect the script tag. The `src` should point to your Glance app (e.g. Vercel/production URL), not a relative path.

### 2. **Config fetch fails**

If `/api/widget/{id}/config` fails (404, CORS, network), the widget never mounts and `_glanceWidgetId` is never set. `_glanceFlush` bails out when `_glanceWidgetId` is null.

**Check:** Open DevTools → Network. Look for a request to `.../api/widget/[uuid]/config`. If it 404s or fails, fix the embed URL.

### 3. **Ad blockers or tracking blockers**

`sendBeacon` to third-party domains is sometimes blocked. Users with privacy extensions may not send any events.

### 4. **Widget ID mismatch**

The `data-widget-id` must be the UUID of the Glance/widget in your database. If it’s wrong, events go to the wrong widget or fail validation.

---

## Changes Recently Made

1. **Preview page analytics** — When the dashboard preview creates the widget manually (not via the script init), `_glanceWidgetId` and `_glanceApiBase` were never set. `connectedCallback` now sets them from `widgetConfig` when present, so preview sessions are tracked.

2. **Debounced flush** — A flush runs 2 seconds after the last tracked event, in addition to the 30s interval and beforeunload. This captures short sessions where users leave before the 30s flush.

---

## Quick Diagnostic Steps for Black Flag

1. **Verify embed on Black Flag’s site**
   - View source or inspect the Glance script.
   - `src` must be absolute (e.g. `https://yourapp.vercel.app/widget.js` or your production domain).

2. **Test in browser**
   - Open the Black Flag site with the widget.
   - Open DevTools → Network.
   - Confirm: `GET .../api/widget/[uuid]/config` returns 200.
   - Confirm: `POST .../api/widget-events` appears after interactions (may take up to ~2 seconds).

3. **Check widget status**
   - If the widget loads and works, config is fine.
   - If there are no `widget-events` requests, `_glanceWidgetId` or `_glanceApiBase` are likely wrong (or blocked).

4. **Direct DB check**
   - In Supabase: `SELECT COUNT(*) FROM widget_events WHERE widget_id IN (SELECT id FROM widgets WHERE workspace_id = 'BLACK_FLAG_WORKSPACE_UUID');`
   - If count is 0, no events have been stored for that workspace.

---

## Embed Code Template

When giving customers embed code, use the **full absolute URL** to your Glance backend:

```html
<script 
  src="https://YOUR_GLANCE_APP_DOMAIN/widget.js" 
  data-widget-id="WIDGET_UUID_HERE"
  async
></script>
```

Replace:
- `YOUR_GLANCE_APP_DOMAIN` — your production URL (e.g. `app.glance.so`, `glance-xxx.vercel.app`)
- `WIDGET_UUID_HERE` — the widget/Glance UUID from the dashboard
