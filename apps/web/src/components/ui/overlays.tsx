import {
  Dialog as DialogPrimitive,
  DropdownMenu as DropdownPrimitive,
  Popover as PopoverPrimitive,
  Tooltip as TooltipPrimitive,
} from 'radix-ui';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------- dialog -- */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({
  className,
  children,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
    <DialogPrimitive.Content
      className={cn(
        'bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border p-6 shadow-2xl outline-none data-[state=open]:animate-[dialog-in_180ms_cubic-bezier(0.2,0.8,0.2,1)]',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-4 right-4 rounded-md p-1 transition-colors">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export const DialogHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);
export const DialogTitle = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn('font-display text-lg font-semibold', className)}
    {...props}
  />
);
export const DialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
);

/* --------------------------------------------------------------- sheet -- */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = ({
  className,
  children,
  side = 'left',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
    <DialogPrimitive.Content
      className={cn(
        'bg-background fixed z-50 flex flex-col shadow-2xl outline-none',
        side === 'left' &&
          'inset-y-0 left-0 w-72 border-r data-[state=open]:animate-[slide-in-left_220ms_cubic-bezier(0.2,0.8,0.2,1)]',
        side === 'right' &&
          'inset-y-0 right-0 w-full max-w-sm border-l data-[state=open]:animate-[slide-in-right_220ms_cubic-bezier(0.2,0.8,0.2,1)]',
        side === 'bottom' &&
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-[state=open]:animate-[slide-in-bottom_220ms_cubic-bezier(0.2,0.8,0.2,1)]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-4 right-4 rounded-md p-1">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

/* ------------------------------------------------------------- popover -- */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = ({
  className,
  align = 'center',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover text-popover-foreground z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-xl border p-4 shadow-xl outline-none data-[state=open]:animate-[pop-in_140ms_ease-out]',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
);

/* ------------------------------------------------------------ dropdown -- */

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export const DropdownMenuContent = ({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'bg-popover text-popover-foreground z-50 min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-xl border p-1 shadow-xl data-[state=open]:animate-[pop-in_120ms_ease-out]',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
);

const itemClass =
  "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground";

export const DropdownMenuItem = ({
  className,
  destructive,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item> & { destructive?: boolean }) => (
  <DropdownPrimitive.Item
    className={cn(
      itemClass,
      destructive &&
        'text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:!text-destructive',
      className,
    )}
    {...props}
  />
);

export const DropdownMenuRadioItem = ({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownPrimitive.RadioItem>) => (
  <DropdownPrimitive.RadioItem className={cn(itemClass, 'pl-7', className)} {...props}>
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <span className="bg-primary block size-1.5 rounded-full" />
      </DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.RadioItem>
);

export const DropdownMenuLabel = ({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Label>) => (
  <DropdownPrimitive.Label
    className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', className)}
    {...props}
  />
);

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Separator>) => (
  <DropdownPrimitive.Separator className={cn('bg-border -mx-1 my-1 h-px', className)} {...props} />
);

/* ------------------------------------------------------------- tooltip -- */

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = ({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        className="bg-foreground text-background z-50 rounded-md px-2.5 py-1 text-xs font-medium shadow-md data-[state=delayed-open]:animate-[pop-in_120ms_ease-out]"
      >
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);
