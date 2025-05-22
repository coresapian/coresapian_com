import * as React from "react"
import { cn } from "@/lib/utils"
import { useRef, useEffect, useState } from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  delay?: number
}

export function GlassCard({
  className,
  glow = false,
  delay = 0,
  children,
  ...props
}: GlassCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "glass-box transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-90",
        glow ? "neon-border border-neon-blue" : "",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  )
}