import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'border-ink/40 flex h-11 w-full border-0 border-b bg-transparent px-0 pb-2 pt-3',
        'font-display text-ink placeholder:text-ink-dim text-lg leading-tight placeholder:italic',
        'transition-colors',
        'focus-visible:border-ink focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
