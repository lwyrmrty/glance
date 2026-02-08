'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  workspaceName?: string
  workspaceId?: string
}

export default function Sidebar({ workspaceName, workspaceId }: SidebarProps) {
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

  return (
    <div className="navwrapper">
      <div className="navbartop">
        <Link href="/" className="navbaricon w-inline-block">
          <img loading="lazy" src="/images/glanceicon.svg" alt="" />
        </Link>
        <div className="navblocks">
          {/* Workspace section label */}
          <div className="labelrow navlabel">
            <div className="labeltext small">{workspaceName || 'Workspace'} <span className="dim">Workspace</span></div>
            <div className="labeldivider darker"></div>
          </div>
          <NavItem
            href={prefix ? `${prefix}/glances` : '/glances'}
            label="Glances"
            icon="/images/glanceicons.svg"
            isActive={isActive(prefix ? `${prefix}/glances` : '/glances')}
          />
          <NavItem
            href={prefix ? `${prefix}/knowledge` : '/knowledge'}
            label="Knowledge"
            icon="/images/brain.svg"
            isActive={isActive(prefix ? `${prefix}/knowledge` : '/knowledge')}
          />
          <NavItem
            href={prefix ? `${prefix}/accounts` : '/accounts'}
            label="User Data"
            icon="/images/users.svg"
            isActive={isActive(prefix ? `${prefix}/accounts` : '/accounts')}
          />
          <NavItem
            href={prefix ? `${prefix}/analytics` : '/analytics'}
            label="Analytics"
            icon="/images/stats.svg"
            isActive={isActive(prefix ? `${prefix}/analytics` : '/analytics')}
          />
          <NavItem
            href={prefix ? `${prefix}/integrations` : '/integrations'}
            label="Integrations"
            icon="/images/plug-connection.svg"
            isActive={isActive(prefix ? `${prefix}/integrations` : '/integrations')}
          />
          <NavItem
            href={prefix ? `${prefix}/settings` : '/settings'}
            label="Settings"
            icon="/images/settings.svg"
            isActive={isActive(prefix ? `${prefix}/settings` : '/settings')}
          />
        </div>
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
