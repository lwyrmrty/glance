'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

interface DashboardClientProps {
  glances: any[]
  workspaceName?: string
  workspaceId?: string
}

export default function DashboardClient({ glances, workspaceName, workspaceId }: DashboardClientProps) {
  const prefix = workspaceId ? `/w/${workspaceId}` : ''
  const tabCount = (glance: any) => {
    return glance.tab_count || 0
  }

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />

        {/* Main Content Area */}
        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img loading="lazy" src="/images/glanceicon-page.svg" alt="" className="navicon page-icon" />
                  </div>
                  <div>
                    <div className="alignrow alignbottom">
                      <h1 className="pageheading">Glances</h1>
                    </div>
                  </div>
                </div>
              </div>
              <div className="contentblock">
                <div className="tablewrapper">
                  <div className="tablerows">
                    {glances.map((glance) => (
                      <div key={glance.id} className="tablerow">
                        <div className="tablerow-left">
                          <div className="tableblock">
                            <div className="tableimage large">
                              {glance.logo_url ? (
                                <img src={glance.logo_url} loading="lazy" alt="" />
                              ) : (
                                <img src="/images/glance-default.png" loading="lazy" alt="" />
                              )}
                            </div>
                            <div>
                              <div className="alignrow aligncenter">
                                <div className="tablename large">{glance.name || 'Untitled Glance'}</div>
                              </div>
                              <div className="tablesublabel">{tabCount(glance)} {tabCount(glance) === 1 ? 'Tab' : 'Tabs'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="tablerow-right">
                          <div className="tableblock right">
                            <Link href={`${prefix}/glances/${glance.id}`} className="tablebutton w-inline-block">
                              <div>View / Edit</div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Link href={`${prefix}/glances/new`} className="button lite w-inline-block">
                  <div>Create a Glance</div>
                </Link>
              </div>
            </div>
            <div className="demoside downflex">
              <img src="/images/visax-RMukvw_Gc0k-unsplash.png" loading="lazy" alt="" className="fullimage" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
