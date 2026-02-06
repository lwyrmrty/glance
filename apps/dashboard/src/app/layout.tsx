import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import { ToastProvider } from '@/components/Toast'
import './normalize.css'
import './webflow.css'
import './glanceit.webflow.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Glance Dashboard',
  description: 'Glance widget management dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={figtree.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
