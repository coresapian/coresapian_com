'use client'

import { ReactNode } from 'react'

interface GlassSectionProps {
  children: ReactNode
  className?: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
}

export default function GlassSection({ 
  children, 
  className = '', 
  position = 'center' 
}: GlassSectionProps) {
  const positionClasses = {
    'top-left': 'top-8 left-8',
    'top-right': 'top-8 right-8',
    'bottom-left': 'bottom-8 left-8',
    'bottom-right': 'bottom-8 right-8',
    'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  }

  return (
    <div 
      className={`
        absolute ${positionClasses[position]}
        backdrop-blur-md bg-white/10 
        border border-white/20 
        rounded-2xl 
        p-8 
        shadow-2xl 
        max-w-md
        transition-all duration-300 
        hover:bg-white/15 
        hover:border-white/30
        hover:shadow-3xl
        hover:scale-105
        ${className}
      `}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {children}
    </div>
  )
}