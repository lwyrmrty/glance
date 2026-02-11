'use client'

import Sidebar from '@/components/Sidebar'

interface ChatsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export function ChatsPage({ workspaceName, workspaceId, glances }: ChatsPageProps) {
  const prefix = workspaceId ? `/w/${workspaceId}` : ''

  return (
    <div className="pagewrapper">
      <div className="pagecontent">
        <Sidebar workspaceName={workspaceName} workspaceId={workspaceId} glances={glances} />
        <div className="mainwrapper">
          <div className="maincontent flex">
            <div className="textside">
              <div className="innerhero">
                <div className="herorow">
                  <div className="pageicon-block large">
                    <img src="/images/playerslite.svg" loading="lazy" alt="" className="heroicon" />
                  </div>
                  <div className="alignrow alignbottom">
                    <h1 className="pageheading">User Data</h1>
                  </div>
                </div>
                <div className="pagesubheading">Manage user accounts and submissions across your widgets.</div>
                <div className="inner-hero-nav">
                  <a href={`${prefix}/accounts`} className="innerhero-nav-link w-inline-block">
                    <div>Accounts</div>
                  </a>
                  <a href={`${prefix}/form-submissions`} className="innerhero-nav-link w-inline-block">
                    <div>Form Submissions</div>
                  </a>
                  <a href={`${prefix}/chats`} className="innerhero-nav-link active w-inline-block">
                    <div>Chats</div>
                  </a>
                  <a href={`${prefix}/account-creation`} className="innerhero-nav-link w-inline-block">
                    <div>Account Creation</div>
                  </a>
                </div>
              </div>

              <div className="contentblock">
                <div className="pagesubheading" style={{ opacity: 0.6 }}>Coming soon.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
