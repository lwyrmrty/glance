import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
