import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'coRESEARCH - AI Research Collective',
  description: 'A collective of AI researchers building systems and frameworks to improve LLM/AI performance and abilities.',
  keywords: 'AI, research, machine learning, artificial intelligence, LLM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}