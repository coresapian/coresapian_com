"use client"

import * as React from "react"
import { 
  FormProvider, 
  Controller, 
  Control, 
  FieldValues,
  FieldPath,
  UseFormReturn,
  ControllerProps
} from "react-hook-form"
import { cn } from "@/lib/utils"

// Form wrapper
export function Form<TFieldValues extends FieldValues = FieldValues>({ 
  children, 
  ...props 
}: React.ComponentProps<typeof FormProvider<TFieldValues>>) {
  return <FormProvider {...props}>{children}</FormProvider>
}

// FormField component
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  render,
}: {
  control: Control<TFieldValues>
  name: TName
  render: ({ field }: { field: any }) => React.ReactElement
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => render({ field })}
    />
  )
}

export function FormItem({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
}

export function FormLabel({ 
  children, 
  htmlFor, 
  className, 
  ...props 
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label 
      htmlFor={htmlFor} 
      className={cn("block text-sm font-medium text-gray-200 font-rajdhani", className)} 
      {...props}
    >
      {children}
    </label>
  )
}

export function FormControl({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-1", className)} {...props}>
      {children}
    </div>
  )
}

export function FormMessage({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? (
    <p className={cn("text-sm text-red-400 font-rajdhani", className)} {...props}>
      {children}
    </p>
  ) : null
}