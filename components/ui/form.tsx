"use client"

import * as React from "react"
import { FormProvider, Controller, Control, FieldValues } from "react-hook-form"
import { cn } from "@/lib/utils"

export function Form<TFieldValues extends FieldValues>(props: React.ComponentProps<typeof FormProvider>) {
  const { children, ...rest } = props
  return <FormProvider {...rest}>{children}</FormProvider>
}

export function FormField<TFieldValues extends FieldValues>({
  control,
  name,
  render,
}: {
  control: Control<TFieldValues>
  name: string
  render: (args: { field: any }) => React.ReactNode
}) {
  return <Controller control={control} name={name as any} render={render as any} />
}

export function FormItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {children}
    </div>
  )
}

export function FormLabel({ children, htmlFor, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-gray-200", className)} {...props}>
      {children}
    </label>
  )
}

export function FormControl({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-1", className)} {...props}>
      {children}
    </div>
  )
}

export function FormMessage({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <p className={cn("text-sm text-red-400", className)} {...props}>
      {children}
    </p>
  )
}
