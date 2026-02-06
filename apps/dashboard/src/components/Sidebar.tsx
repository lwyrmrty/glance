'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/glances') {
      // Glances is active for /glances and /glances/* but not for other top-level routes
      return pathname === '/glances' || (pathname.startsWith('/glances/') && !pathname.startsWith('/glances/knowledge'))
    }
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <div className="navwrapper">
      <div className="navbartop">
        <Link href="/glances" className="navbaricon w-inline-block">
          <img loading="lazy" src="/images/glanceicon.svg" alt="" />
        </Link>
        <div className="navblocks">
          <NavItem 
            href="/glances" 
            label="Glances" 
            activeIcon="/images/chart-pie-alt.svg"
            inactiveIcon="/images/glanceicons.svg"
            isActive={isActive('/glances')}
          />
          <NavItem 
            href="/knowledge" 
            label="Knowledge" 
            activeIcon="/images/chart-pie-alt.svg"
            inactiveIcon="/images/highlighter-line.svg"
            isActive={isActive('/knowledge')}
          />
          <NavItem 
            href="/accounts" 
            label="User Data" 
            activeIcon="/images/chart-pie-alt.svg"
            inactiveIcon="/images/users.svg"
            isActive={isActive('/accounts')}
          />
        </div>
      </div>
      <div className="navbarbottom">
        <div className="navblocks">
          <NavItem 
            href="/settings" 
            label="Settings" 
            activeIcon="/images/chart-pie-alt.svg"
            inactiveIcon="/images/settings.svg"
            isActive={isActive('/settings')}
          />
          <NavItem 
            href="/integrations" 
            label="Integrations" 
            activeIcon="/images/chart-pie-alt.svg"
            inactiveIcon="/images/hourglass-end.svg"
            isActive={isActive('/integrations')}
          />
          <div className="navbarblock logout">
            <form action="/auth/signout" method="POST" style={{ display: 'contents' }}>
              <button type="submit" className="navbarlink-row logout w-inline-block" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <div className="alignrow aligncenter">
                  <div className="navbarlink-icon">
                    <img loading="lazy" src="/images/golf.svg" alt="" className="navicon activeicon" style={{ display: 'none' }} />
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
        .navicon.nonactive {
          display: block;
        }
        .activeindicator {
          display: none;
        }
        .navbarlink-row.w--current .activeindicator {
          display: block;
        }
      `}} />
    </div>
  )
}

interface NavItemProps {
  href: string
  label: string
  activeIcon?: string
  inactiveIcon: string
  isActive: boolean
}

function NavItem({ href, label, inactiveIcon, isActive }: NavItemProps) {
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
              src={inactiveIcon} 
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
