'use client'

import { ReactNode, useEffect, useState } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  maxWidth?: string
  glow?: boolean
  delay?: number
}

export default function GlassPanel({ 
  children, 
  className = '', 
  maxWidth = 'max-w-2xl',
  glow = false,
  delay = 0
}: GlassPanelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div 
      className={`
        glass-panel glass-panel-hover
        rounded-2xl p-8 m-4
        ${maxWidth}
        transform transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${glow ? 'neon-border border-neon-blue' : ''}
        ${className}
      `}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {children}
    </div>
  )
}