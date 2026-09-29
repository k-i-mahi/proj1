import { cva, type VariantProps } from 'class-variance-authority';
import { Avatar as AvatarPrimitive, Separator as SeparatorPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn, initials } from '@/lib/utils';

/* ---------------------------------------------------------------- card -- */

export const Card = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="card"
    className={cn('bg-card text-card-foreground rounded-xl border shadow-xs', className)}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex flex-col gap-1.5 p-5 pb-0', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<'h3'>) => (
  <h3 className={cn('text-base leading-none font-semibold', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: ComponentProps<'p'>) => (
  <p className={cn('text-muted-foreground text-sm', className)} {...props} />
);

export const CardContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('p-5', className)} {...props} />
);

/* --------------------------------------------------------------- badge -- */

export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary dark:bg-primary/20',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const Badge = ({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) => (
  <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
);

/* -------------------------------------------------------------- avatar -- */

const avatarColors = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const Avatar = ({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) => (
  <AvatarPrimitive.Root
    className={cn(
      'relative flex size-8 shrink-0 overflow-hidden rounded-full text-xs select-none',
      className,
    )}
  >
    {src && (
      <AvatarPrimitive.Image
        src={src}
        alt={name}
        className="aspect-square size-full object-cover"
      />
    )}
    <AvatarPrimitive.Fallback
      delayMs={src ? 400 : 0}
      className={cn(
        'flex size-full items-center justify-center bg-gradient-to-br font-semibold text-white',
        avatarColors[hash(name) % avatarColors.length],
      )}
    >
      {initials(name)}
    </AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
);

/* ------------------------------------------------------------ skeleton -- */

export const Skeleton = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="skeleton"
    className={cn(
      'bg-muted animate-shimmer rounded-md bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent)] bg-[length:200%_100%]',
      className,
    )}
    {...props}
  />
);

/* ----------------------------------------------------------- separator -- */

export const Separator = ({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) => (
  <SeparatorPrimitive.Root
    decorative
    orientation={orientation}
    className={cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
);

/* ---------------------------------------------------------------- kbd -- */

export const Kbd = ({ className, ...props }: ComponentProps<'kbd'>) => (
  <kbd
    className={cn(
      'bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none',
      className,
    )}
    {...props}
  />
);
