import { cookies } from 'next/headers'

const COOKIE_NAME = 'active_workspace_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Get the active workspace for the current user.
 * Reads from the active_workspace_id cookie, validates membership,
 * and falls back to the first workspace if cookie is missing/invalid.
 * Returns null if the user has no workspaces at all.
 */
export async function getActiveWorkspace(
  supabase: any,
  userId: string
): Promise<{ workspace_id: string; workspace_name: string; role: string } | null> {
  const cookieStore = await cookies()
  const activeId = cookieStore.get(COOKIE_NAME)?.value

  // If we have a cookie, validate the user is a member of that workspace
  if (activeId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(name)')
      .eq('user_id', userId)
      .eq('workspace_id', activeId)
      .single()

    if (membership) {
      return {
        workspace_id: membership.workspace_id,
        workspace_name: (membership.workspaces as any)?.name ?? 'Workspace',
        role: membership.role,
      }
    }
  }

  // Cookie missing or invalid — fall back to the first workspace
  const { data: firstMembership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(name)')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: true })
    .limit(1)
    .single()

  if (!firstMembership) {
    return null
  }

  return {
    workspace_id: firstMembership.workspace_id,
    workspace_name: (firstMembership.workspaces as any)?.name ?? 'Workspace',
    role: firstMembership.role,
  }
}

/**
 * Set the active workspace cookie.
 * Call this from a server action or API route.
 */
export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, workspaceId, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
  })
}

/**
 * Validate that a user has access to a specific workspace.
 * Used by URL-based /w/[workspaceId] routes.
 */
export async function validateWorkspaceAccess(
  supabase: any,
  userId: string,
  workspaceId: string
): Promise<{ workspace_id: string; workspace_name: string; workspace_logo_url?: string | null; role: string } | null> {
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(name, logo_url)')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!membership) return null

  return {
    workspace_id: workspaceId,
    workspace_name: (membership.workspaces as any)?.name ?? 'Workspace',
    workspace_logo_url: (membership.workspaces as any)?.logo_url ?? null,
    role: membership.role,
  }
}

export { COOKIE_NAME }
