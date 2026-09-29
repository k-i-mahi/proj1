import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'A letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
  {
    label: 'Upper & lower case',
    test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p),
    optional: true,
  },
];

export const PasswordStrength = ({ password }: { password: string }) => {
  const score = RULES.filter((r) => r.test(password)).length;
  const colors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];
  return (
    <div className="grid gap-2" aria-live="polite">
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score && password ? colors[score] : 'bg-muted',
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li
              key={r.label}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                ok ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {ok ? <Check className="size-3" /> : <X className="size-3 opacity-60" />}
              {r.label}
              {r.optional && <span className="opacity-60">(bonus)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
