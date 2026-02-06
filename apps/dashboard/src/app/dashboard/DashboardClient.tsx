'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        {/* Left Sidebar Navigation */}
        <div className="navwrapper">
          <div className="navbartop">
            <Link href="/dashboard" className="navbaricon w-inline-block">
              <img loading="lazy" src="/images/glanceicon.svg" alt="" />
            </Link>
            <div className="navblocks">
              <div className="navbarblock">
                <Link 
                  href="/dashboard" 
                  className={`navbarlink-row w-inline-block ${isActive('/dashboard') && !pathname.includes('/knowledge') && !pathname.includes('/accounts') ? 'w--current' : ''}`}
                >
                  <div className="alignrow aligncenter">
                    <div className={`navbarlink-icon ${isActive('/dashboard') && !pathname.includes('/knowledge') && !pathname.includes('/accounts') ? 'active' : ''}`}>
                      <img 
                        loading="lazy" 
                        src="/images/chart-pie-alt.svg" 
                        alt="" 
                        className="navicon activeicon" 
                        style={{ display: isActive('/dashboard') && !pathname.includes('/knowledge') && !pathname.includes('/accounts') ? 'block' : 'none' }}
                      />
                      <img 
                        loading="lazy" 
                        src="/images/glanceicons.svg" 
                        alt="" 
                        className="navicon nonactive"
                        style={{ display: isActive('/dashboard') && !pathname.includes('/knowledge') && !pathname.includes('/accounts') ? 'none' : 'block' }}
                      />
                    </div>
                    <div>Glances</div>
                  </div>
                  <div className="activeindicator" style={{ display: isActive('/dashboard') && !pathname.includes('/knowledge') && !pathname.includes('/accounts') ? 'block' : 'none' }}></div>
                </Link>
              </div>
              <div className="navbarblock">
                <Link 
                  href="/dashboard/knowledge" 
                  className={`navbarlink-row w-inline-block ${isActive('/dashboard/knowledge') ? 'w--current' : ''}`}
                >
                  <div className="alignrow aligncenter">
                    <div className={`navbarlink-icon ${isActive('/dashboard/knowledge') ? 'active' : ''}`}>
                      <img 
                        loading="lazy" 
                        src="/images/chart-pie-alt.svg" 
                        alt="" 
                        className="navicon activeicon"
                        style={{ display: isActive('/dashboard/knowledge') ? 'block' : 'none' }}
                      />
                      <img 
                        loading="lazy" 
                        src="/images/highlighter-line.svg" 
                        alt="" 
                        className="navicon nonactive"
                        style={{ display: isActive('/dashboard/knowledge') ? 'none' : 'block' }}
                      />
                    </div>
                    <div>Knowledge</div>
                  </div>
                  <div className="activeindicator" style={{ display: isActive('/dashboard/knowledge') ? 'block' : 'none' }}></div>
                </Link>
              </div>
              <div className="navbarblock">
                <Link 
                  href="/dashboard/accounts" 
                  className={`navbarlink-row w-inline-block ${isActive('/dashboard/accounts') ? 'w--current' : ''}`}
                >
                  <div className="alignrow aligncenter">
                    <div className={`navbarlink-icon ${isActive('/dashboard/accounts') ? 'active' : ''}`}>
                      <img 
                        loading="lazy" 
                        src="/images/chart-pie-alt.svg" 
                        alt="" 
                        className="navicon activeicon"
                        style={{ display: isActive('/dashboard/accounts') ? 'block' : 'none' }}
                      />
                      <img 
                        loading="lazy" 
                        src="/images/users.svg" 
                        alt="" 
                        className="navicon nonactive"
                        style={{ display: isActive('/dashboard/accounts') ? 'none' : 'block' }}
                      />
                    </div>
                    <div>User Data</div>
                  </div>
                  <div className="activeindicator" style={{ display: isActive('/dashboard/accounts') ? 'block' : 'none' }}></div>
                </Link>
              </div>
            </div>
          </div>
          <div className="navbarbottom">
            <div className="navblocks">
              <div className="navbarblock">
                <Link 
                  href="/dashboard/settings" 
                  className={`navbarlink-row w-inline-block ${isActive('/dashboard/settings') ? 'w--current' : ''}`}
                >
                  <div className="alignrow aligncenter">
                    <div className={`navbarlink-icon ${isActive('/dashboard/settings') ? 'active' : ''}`}>
                      <img 
                        loading="lazy" 
                        src="/images/chart-pie-alt.svg" 
                        alt="" 
                        className="navicon activeicon"
                        style={{ display: isActive('/dashboard/settings') ? 'block' : 'none' }}
                      />
                      <img 
                        loading="lazy" 
                        src="/images/settings.svg" 
                        alt="" 
                        className="navicon nonactive"
                        style={{ display: isActive('/dashboard/settings') ? 'none' : 'block' }}
                      />
                    </div>
                    <div>Settings</div>
                  </div>
                  <div className="activeindicator" style={{ display: isActive('/dashboard/settings') ? 'block' : 'none' }}></div>
                </Link>
              </div>
              <div className="navbarblock">
                <Link 
                  href="/dashboard/integrations" 
                  className={`navbarlink-row w-inline-block ${isActive('/dashboard/integrations') ? 'w--current' : ''}`}
                >
                  <div className="alignrow aligncenter">
                    <div className={`navbarlink-icon ${isActive('/dashboard/integrations') ? 'active' : ''}`}>
                      <img 
                        loading="lazy" 
                        src="/images/chart-pie-alt.svg" 
                        alt="" 
                        className="navicon activeicon"
                        style={{ display: isActive('/dashboard/integrations') ? 'block' : 'none' }}
                      />
                      <img 
                        loading="lazy" 
                        src="/images/hourglass-end.svg" 
                        alt="" 
                        className="navicon nonactive"
                        style={{ display: isActive('/dashboard/integrations') ? 'none' : 'block' }}
                      />
                    </div>
                    <div>Integrations</div>
                  </div>
                  <div className="activeindicator" style={{ display: isActive('/dashboard/integrations') ? 'block' : 'none' }}></div>
                </Link>
              </div>
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
              background-color: rgba(0, 0, 0, 1);
            }
          `}} />
        </div>

        {/* Main Content Area */}
        <div className="mainwrapper padd">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img loading="lazy" src="/images/glanceicon.svg" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">Glances</h1>
                  </div>
                </div>
                <div className="pagesubheading">Create a Glance for your website.</div>
              </div>
              <div className="contentblock">
                <div className="nonempty">
                  {/* Table Header with Bulk Actions */}
                  <div className="tablerow header">
                    <div className="tablerow-left">
                      <div className="tableblock">
                        <div className="checkboxwrapper">
                          <div className="checkboxelement"></div>
                        </div>
                        <div className="bulkactions-row">
                          <a href="#" className="bulkaction-button delete w-inline-block">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                              <path d="M14.5 18C15.3284 18 16 17.3284 16 16.5V10.5C16 9.67158 15.3284 9 14.5 9C13.6716 9 13 9.67158 13 10.5V16.5C13 17.3284 13.6716 18 14.5 18Z" fill="currentColor"></path>
                              <path d="M9.5 18C10.3284 18 11 17.3284 11 16.5V10.5C11 9.67158 10.3284 9 9.5 9C8.67158 9 8 9.67158 8 10.5V16.5C8 17.3284 8.67158 18 9.5 18Z" fill="currentColor"></path>
                              <path d="M23 4.5C23 3.67158 22.3285 3 21.5 3H17.724C17.0921 1.20736 15.4007 0.00609375 13.5 0H10.5C8.59928 0.00609375 6.90789 1.20736 6.27602 3H2.5C1.67158 3 1 3.67158 1 4.5C1 5.32842 1.67158 6 2.5 6H3.00002V18.5C3.00002 21.5376 5.46245 24 8.5 24H15.5C18.5376 24 21 21.5376 21 18.5V6H21.5C22.3285 6 23 5.32842 23 4.5ZM18 18.5C18 19.8807 16.8807 21 15.5 21H8.5C7.1193 21 6.00002 19.8807 6.00002 18.5V6H18V18.5Z" fill="currentColor"></path>
                            </svg>
                            <div>Delete</div>
                          </a>
                          <a href="#" className="bulkaction-button w-inline-block">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="actionicon">
                              <g>
                                <path d="M18.0001 13.4999V7.57093C18.0035 6.71662 17.8373 5.87013 17.5111 5.08051C17.185 4.2909 16.7054 3.57385 16.1001 2.97093L15.0251 1.89993C14.4222 1.29467 13.7052 0.815067 12.9155 0.488922C12.1259 0.162777 11.2794 -0.0034315 10.4251 -7.21461e-05H7.50012C6.04192 0.00151602 4.64389 0.581489 3.61279 1.61259C2.58168 2.6437 2.00171 4.04173 2.00012 5.49993V13.4999C2.00171 14.9581 2.58168 16.3562 3.61279 17.3873C4.64389 18.4184 6.04192 18.9983 7.50012 18.9999H12.5001C13.9583 18.9983 15.3563 18.4184 16.3875 17.3873C17.4186 16.3562 17.9985 14.9581 18.0001 13.4999ZM5.00012 13.4999V5.49993C5.00012 4.83689 5.26351 4.201 5.73236 3.73216C6.2012 3.26332 6.83708 2.99993 7.50012 2.99993H10.4291C10.6207 3.00294 10.8116 3.02167 11.0001 3.05593V4.99993C11.0001 5.53036 11.2108 6.03907 11.5859 6.41414C11.961 6.78922 12.4697 6.99993 13.0001 6.99993H14.9441C14.9784 7.18841 14.9971 7.37938 15.0001 7.57093V13.4999C15.0001 14.163 14.7367 14.7989 14.2679 15.2677C13.799 15.7365 13.1632 15.9999 12.5001 15.9999H7.50012C6.83708 15.9999 6.2012 15.7365 5.73236 15.2677C5.26351 14.7989 5.00012 14.163 5.00012 13.4999ZM23.0001 8.49993V18.4999C22.9985 19.9581 22.4186 21.3562 21.3875 22.3873C20.3563 23.4184 18.9583 23.9983 17.5001 23.9999H9.50012C9.1023 23.9999 8.72077 23.8419 8.43946 23.5606C8.15816 23.2793 8.00012 22.8978 8.00012 22.4999C8.00012 22.1021 8.15816 21.7206 8.43946 21.4393C8.72077 21.158 9.1023 20.9999 9.50012 20.9999H17.5001C18.1632 20.9999 18.799 20.7365 19.2679 20.2677C19.7367 19.7989 20.0001 19.163 20.0001 18.4999V8.49993C20.0001 8.1021 20.1582 7.72057 20.4395 7.43927C20.7208 7.15796 21.1023 6.99993 21.5001 6.99993C21.8979 6.99993 22.2795 7.15796 22.5608 7.43927C22.8421 7.72057 23.0001 8.1021 23.0001 8.49993Z" fill="currentColor"></path>
                              </g>
                            </svg>
                            <div>Duplicate</div>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="tablerow-right">
                      <div className="tableblock right nopadding">
                        <Link href="/dashboard/glances/new" className="bulkaction-button w-inline-block">
                          <div>New Glance</div>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="addicon">
                            <g>
                              <g data-name="plus-square">
                                <path d="M15 11h-2V9a1 1 0 0 0-2 0v2H9a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2z"></path>
                                <path d="M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"></path>
                                <rect width="24" height="24" fill="currentColor" opacity="0"></rect>
                              </g>
                            </g>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Table Rows - Sample Data */}
                  <div className="tablewrapper">
                    <div className="tablerows">
                      <div className="tablerow">
                        <div className="tablerow-left">
                          <div className="tableblock">
                            <div className="checkboxwrapper">
                              <div className="checkboxelement"></div>
                            </div>
                            <div className="tableimage loadingpercentage">
                              <img src="/images/VCSWeb.png" loading="lazy" alt="" className="fullimage" />
                            </div>
                            <div>
                              <div className="alignrow aligncenter">
                                <div className="tablename large">VC Sheet<br /></div>
                                <div className="statuscircle"></div>
                              </div>
                              <div className="tablesublabel">5 Widgets</div>
                            </div>
                          </div>
                        </div>
                        <div className="tablerow-right">
                          <div className="tableblock right">
                            <Link href="/dashboard/glances/1" className="tablebutton w-inline-block">
                              <div>View / Edit</div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empty State - Hidden when there's data */}
                  <div className="empty-state" style={{ display: 'none' }}>
                    <div className="emptycontent">
                      <div className="emptystate-heading">No Glances created yet.</div>
                      <div className="emptystate-subheading">The magic awaits...</div>
                    </div>
                    <a href="#" className="button outline w-inline-block">
                      <div>Create your first Glance</div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
