import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PreviewPage from './PreviewPage'

export default async function GlancePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  const { data: glance } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', id)
    .single()

  if (!glance) {
    redirect('/glances')
  }

  return <PreviewPage glance={glance} />
}
