import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coresapian - AI Research Collective',
  description: 'A collective of Coresapians—open-source AI researchers and inquisitive minds—evolving human discovery through collaborative innovation in AI systems and frameworks.',
  keywords: 'AI, research, machine learning, artificial intelligence, LLM, Coresapian, open-source, evolution, discovery',
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