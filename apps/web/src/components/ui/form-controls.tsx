import {
  Checkbox as CheckboxPrimitive,
  Label as LabelPrimitive,
  Switch as SwitchPrimitive,
} from 'radix-ui';
import { Check } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30';

export const Input = ({ className, ...props }: ComponentProps<'input'>) => (
  <input
    data-slot="input"
    className={cn(
      fieldBase,
      'h-10 py-2 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
);

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    data-slot="textarea"
    className={cn(fieldBase, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
    {...props}
  />
);

export const Label = ({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    data-slot="label"
    className={cn(
      'text-sm leading-none font-medium select-none peer-disabled:opacity-50',
      className,
    )}
    {...props}
  />
);

/** Label + control + hint/error, wired up for screen readers. */
export const Field = ({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  action,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) => (
  <div className={cn('grid gap-2', className)}>
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor}>{label}</Label>
      {action}
    </div>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="text-destructive text-xs font-medium">
        {error}
      </p>
    ) : hint ? (
      <p id={`${htmlFor}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </p>
    ) : null}
  </div>
);

export const Switch = ({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-ring inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="bg-background pointer-events-none block size-4 rounded-full shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
);

export const Checkbox = ({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) => (
  <CheckboxPrimitive.Root
    className={cn(
      'peer border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground focus-visible:ring-ring size-4 shrink-0 cursor-pointer rounded-[5px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
