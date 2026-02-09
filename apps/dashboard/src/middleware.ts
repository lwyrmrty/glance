import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const WORKSPACE_COOKIE = 'active_workspace_id'
const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Sync active_workspace_id cookie when visiting /w/[workspaceId] routes
  // so API routes (which read the cookie) always use the correct workspace.
  const match = request.nextUrl.pathname.match(/^\/w\/([^/]+)/)
  if (match) {
    const workspaceId = match[1]
    const current = request.cookies.get(WORKSPACE_COOKIE)?.value
    if (current !== workspaceId) {
      response.cookies.set(WORKSPACE_COOKIE, workspaceId, {
        path: '/',
        maxAge: WORKSPACE_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - api/ (API routes handle their own auth / CORS)
     * - widget.js / widget.css (public widget assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api/|widget\\.js|widget\\.css|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
