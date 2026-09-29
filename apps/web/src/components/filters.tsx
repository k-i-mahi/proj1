import { ChevronDown, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Checkbox } from './ui/form-controls';
import { Popover, PopoverContent, PopoverTrigger } from './ui/overlays';

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** A compact multi-select used in filter toolbars. */
export const MultiSelectFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9', selected.length && 'border-primary/40 bg-primary/5')}
        >
          {label}
          {selected.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] leading-4">
              {selected.length}
            </span>
          )}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.map((o) => {
            const id = `filter-${label}-${o.value}`;
            return (
              <label
                key={o.value}
                htmlFor={id}
                className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
              >
                <Checkbox
                  id={id}
                  checked={selected.includes(o.value)}
                  onCheckedChange={() => toggle(o.value)}
                />
                {o.icon}
                <span className="truncate">{o.label}</span>
              </label>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="mt-1 border-t pt-1">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const FilterChip = ({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) => (
  <span className="bg-secondary inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium">
    {children}
    <button
      type="button"
      onClick={onRemove}
      className="hover:bg-foreground/10 cursor-pointer rounded-full p-0.5"
      aria-label="Remove filter"
    >
      <X className="size-3" />
    </button>
  </span>
);
