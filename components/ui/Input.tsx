import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-bold uppercase tracking-widest text-ops-muted">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-lg border bg-ops-panel2 px-3 py-2 text-sm text-ops-text transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ops-faint focus:outline-none focus:ring-2 focus:ring-info-500/50 disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-ops-border focus:border-info-500',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
