'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export default function Sidebar({ workspaceName, workspaceId, glances }: SidebarProps) {
  const pathname = usePathname()

  // Build the workspace URL prefix
  const prefix = workspaceId ? `/w/${workspaceId}` : ''

  const isActive = (href: string) => {
    // Remove query params and trailing slashes for comparison
    const cleanPathname = pathname.split('?')[0].replace(/\/$/, '')
    const cleanHref = href.replace(/\/$/, '')
    
    // Check exact match or if pathname starts with the href followed by /
    return cleanPathname === cleanHref || cleanPathname.startsWith(cleanHref + '/')
  }

  // Check if we're on the Glances list page (not a specific Glance page)
  const isGlancesListPage = pathname === `${prefix}/glances` || pathname === `${prefix}/glances/`

  // Extract the current Glance ID from pathname if we're on a Glance page
  const currentGlanceId = pathname.match(new RegExp(`${prefix}/glances/([^/]+)`))?.[1]

  return (
    <div className="navwrapper">
      <div className="navbartop">
        <Link href="/" className="navbaricon w-inline-block">
          <img loading="lazy" src="/images/glanceicon.svg" alt="" />
        </Link>
        {workspaceId && (
          <div className="navblocks">
            {/* Workspace section label */}
            <div className="labelrow navlabel">
              <div className="labeltext small">{workspaceName || 'Workspace'} <span className="dim">Workspace</span></div>
              <div className="labeldivider darker"></div>
            </div>
            <GlancesNavItem
              href={`${prefix}/glances`}
              label="Glances"
              icon="/images/glanceicons.svg"
              isActive={isGlancesListPage}
              glances={glances?.slice(0, 3) || []}
              prefix={prefix}
              currentGlanceId={currentGlanceId}
            />
            <NavItem
              href={`${prefix}/knowledge`}
              label="Knowledge"
              icon="/images/brain.svg"
              isActive={isActive(`${prefix}/knowledge`)}
            />
            <NavItem
              href={`${prefix}/accounts`}
              label="User Data"
              icon="/images/users.svg"
              isActive={isActive(`${prefix}/accounts`) || isActive(`${prefix}/form-submissions`) || isActive(`${prefix}/chats`) || isActive(`${prefix}/account-creation`)}
            />
            <NavItem
              href={`${prefix}/analytics`}
              label="Analytics"
              icon="/images/stats.svg"
              isActive={isActive(`${prefix}/analytics`)}
            />
            <NavItem
              href={`${prefix}/integrations`}
              label="Integrations"
              icon="/images/plug-connection.svg"
              isActive={isActive(`${prefix}/integrations`)}
            />
            <NavItem
              href={`${prefix}/settings`}
              label="Settings"
              icon="/images/settings.svg"
              isActive={isActive(`${prefix}/settings`)}
            />
          </div>
        )}
      </div>
      <div className="navbarbottom">
        {/* Account section label */}
        <div className="labelrow navlabel">
          <div className="labeltext small">Account</div>
          <div className="labeldivider darker"></div>
        </div>
        <div className="navblocks">
          <NavItem
            href="/"
            label="Workspaces"
            icon="/images/apps.svg"
            isActive={pathname === '/'}
          />
          <NavItem
            href="/account"
            label="Account"
            icon="/images/home.svg"
            isActive={pathname === '/account' || pathname.startsWith('/account/')}
          />
          <div className="navbarblock logout">
            <form action="/auth/signout" method="POST" style={{ display: 'contents' }}>
              <button type="submit" className="navbarlink-row logout w-inline-block" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <div className="alignrow aligncenter">
                  <div className="navbarlink-icon">
                    <img loading="lazy" src="/images/sign-out-alt.svg" alt="" className="navicon nonactive" style={{ display: 'block' }} />
                  </div>
                  <div>Logout</div>
                </div>
                <div className="activeindicator" style={{ display: 'none' }}></div>
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Embedded CSS for nav icon states */}
      <style dangerouslySetInnerHTML={{ __html: `
        .navicon.activeicon {
          display: none;
        }
        .navicon.nonactive {
          display: block;
        }
        .activeindicator {
          display: none;
        }
        .navbarlink-row.w--current .activeindicator {
          display: block;
        }
        .navbarlink-icon.active {
          transform: translateY(-1px);
        }
      `}} />
    </div>
  )
}

interface NavItemProps {
  href: string
  label: string
  icon: string
  isActive: boolean
}

function NavItem({ href, label, icon, isActive }: NavItemProps) {
  return (
    <div className="navbarblock">
      <Link
        href={href}
        className={`navbarlink-row w-inline-block ${isActive ? 'w--current' : ''}`}
      >
        <div className="alignrow aligncenter">
          <div className="navbarlink-icon">
            <img
              loading="lazy"
              src={icon}
              alt=""
              className="navicon nonactive"
              style={{ display: 'block' }}
            />
          </div>
          <div>{label}</div>
        </div>
        <div className="activeindicator" style={{ display: isActive ? 'block' : 'none' }}></div>
      </Link>
    </div>
  )
}

interface GlancesNavItemProps {
  href: string
  label: string
  icon: string
  isActive: boolean
  glances: Array<{ id: string; name: string; logo_url?: string | null }>
  prefix: string
  currentGlanceId?: string
}

function GlancesNavItem({ href, label, icon, isActive, glances, prefix, currentGlanceId }: GlancesNavItemProps) {
  return (
    <div className="glancenav-block">
      <Link
        href={href}
        className={`navbarlink-row w-inline-block ${isActive ? 'w--current' : ''}`}
      >
        <div className="alignrow aligncenter">
          <div className="navbarlink-icon">
            <img
              loading="lazy"
              src={icon}
              alt=""
              className="navicon nonactive"
              style={{ display: 'block' }}
            />
          </div>
          <div>{label}</div>
        </div>
        <div className="activeindicator" style={{ display: isActive ? 'block' : 'none' }}></div>
      </Link>
      {glances.length > 0 && (
        <div className="glancesdrawer">
          {glances.map((glance) => {
            const isGlanceActive = currentGlanceId === glance.id
            return (
              <Link
                key={glance.id}
                href={`${prefix}/glances/${glance.id}`}
                className={`navbarlink-row w-inline-block ${isGlanceActive ? 'w--current' : ''}`}
              >
                <div className="alignrow aligncenter">
                  <div className="navbarlink-icon">
                    {glance.logo_url ? (
                      <img src={glance.logo_url} loading="lazy" alt="" />
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '100%', 
                        height: '100%', 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: '#7C3AED', 
                        background: '#f3f0ff',
                        borderRadius: '7px'
                      }}>
                        {glance.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>{glance.name}</div>
                </div>
                <div className="activeindicator" style={{ display: isGlanceActive ? 'block' : 'none' }}></div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
