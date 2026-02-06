'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

interface DashboardClientProps {
  glances: any[]
}

export default function DashboardClient({ glances }: DashboardClientProps) {
  const tabCount = (glance: any) => {
    const tabs = (glance.button_style as any)?.tabs ?? []
    return tabs.filter((t: any) => t.name?.trim()).length
  }

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar />

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
                {glances.length > 0 ? (
                  <div className="nonempty">
                    <div className="tablewrapper">
                      <div className="tablerows">
                        {glances.map((glance) => (
                          <div key={glance.id} className="tablerow">
                            <div className="tablerow-left">
                              <div className="tableblock">
                                <div className="checkboxwrapper">
                                  <div className="checkboxelement"></div>
                                </div>
                                <div className="tableimage loadingpercentage">
                                  {glance.logo_url ? (
                                    <img src={glance.logo_url} loading="lazy" alt="" className="fullimage" />
                                  ) : (
                                    <img src="/images/glance-default.png" loading="lazy" alt="" className="fullimage" />
                                  )}
                                </div>
                                <div>
                                  <div className="alignrow aligncenter">
                                    <div className="tablename large">{glance.name || 'Untitled Glance'}</div>
                                    <div className="statuscircle"></div>
                                  </div>
                                  <div className="tablesublabel">{tabCount(glance)} {tabCount(glance) === 1 ? 'Tab' : 'Tabs'}</div>
                                </div>
                              </div>
                            </div>
                            <div className="tablerow-right">
                              <div className="tableblock right">
                                <Link href={`/glances/${glance.id}`} className="tablebutton w-inline-block">
                                  <div>View / Edit</div>
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="spacer20"></div>
                    <Link href="/glances/new" className="button outline w-inline-block">
                      <div>Create New Glance</div>
                    </Link>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="emptycontent">
                      <div className="emptystate-heading">No Glances created yet.</div>
                      <div className="emptystate-subheading">The magic awaits...</div>
                    </div>
                    <Link href="/glances/new" className="button outline w-inline-block">
                      <div>Create your first Glance</div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
