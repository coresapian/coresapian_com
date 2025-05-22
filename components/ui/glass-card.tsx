import * as React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  delay?: number
  maxWidth?: string
}

export function GlassCard({
  className,
  glow = false,
  delay = 0,
  maxWidth = "max-w-2xl",
  children,
  ...props
}: GlassCardProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  return (
    <div
      className={cn(
        "glass-panel glass-panel-hover rounded-2xl p-8 mx-auto my-8",
        maxWidth,
        "transform transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        glow ? "neon-border border-neon-blue" : "",
        className
      )}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      {...props}
    >
      {children}
    </div>
  )
}