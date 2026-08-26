import type { ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  required,
  error,
  description,
  children,
}: {
  label: ReactNode
  htmlFor: string
  required?: boolean
  error?: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!error && description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
