import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest transition-[background,color,border] duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-ink hover:text-carta-light',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-ink',
        outline: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-carta-light',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-ink hover:text-carta-light',
        ghost:
          'text-ink underline-offset-[6px] decoration-pomodoro decoration-[1.5px] hover:underline',
        link: 'text-pomodoro underline decoration-[1.5px] underline-offset-[6px] hover:decoration-ink',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-[10px]',
        lg: 'h-12 px-7 text-xs',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
