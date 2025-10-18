import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"
import Navigation from '@/components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smart Nudge Builder - AI-Powered CRO Analysis',
  description: 'AI-powered funnel analysis for DTC brands. Turn any landing page into a conversion machine.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
