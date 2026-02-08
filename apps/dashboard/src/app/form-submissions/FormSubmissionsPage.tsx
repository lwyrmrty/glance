'use client'

import Sidebar from '@/components/Sidebar'

interface FormSubmissionsPageProps {
  workspaceName?: string
  workspaceId?: string
  glances?: Array<{ id: string; name: string; logo_url?: string | null }>
}

export function FormSubmissionsPage({ workspaceName, workspaceId, glances }: FormSubmissionsPageProps) {
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
                  <a href={`${prefix}/form-submissions`} className="innerhero-nav-link active w-inline-block">
                    <div>Form Submissions</div>
                  </a>
                  <a href={`${prefix}/account-creation`} className="innerhero-nav-link w-inline-block">
                    <div>Account Creation</div>
                  </a>
                </div>
              </div>

              <div className="contentblock">
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  Form submissions will appear here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
