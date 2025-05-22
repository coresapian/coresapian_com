import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  centered?: boolean
}

const maxWidthMap = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md", 
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full"
}

export function SectionContainer({
  className,
  maxWidth = "xl",
  centered = true,
  children,
  ...props
}: SectionContainerProps) {
  return (
    <section 
      className={cn(
        "min-h-screen flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-full",
          maxWidthMap[maxWidth],
          centered ? "mx-auto" : ""
        )}
      >
        {children}
      </div>
    </section>
  )
}