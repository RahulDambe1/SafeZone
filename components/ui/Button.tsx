import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emergency' | 'critical'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-ops-text text-ops-bg hover:bg-white active:scale-95': variant === 'primary',
            'bg-ops-panel2 text-ops-text hover:bg-ops-border active:scale-95 border border-ops-border': variant === 'secondary',
            'border-2 border-ops-border2 bg-transparent text-ops-text hover:bg-ops-panel2 active:scale-95': variant === 'outline',
            'bg-transparent text-ops-text hover:bg-ops-panel2 active:scale-95': variant === 'ghost',
            'btn-emergency': variant === 'emergency',
            'bg-critical-600 text-white hover:bg-critical-700 shadow-emergency active:scale-95': variant === 'critical',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'px-8 py-5 text-xl rounded-2xl': size === 'xl',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button