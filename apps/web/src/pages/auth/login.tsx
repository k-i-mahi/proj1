import { loginSchema, type LoginInput } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ShieldCheck, UserCog, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { Separator } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/misc';
import { ApiError, errorMessage } from '@/lib/api';
import { safeNext } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

const DEMO_ACCOUNTS = [
  { label: 'Resident', email: 'resident@civita.dev', icon: UserRound },
  { label: 'Authority', email: 'authority@civita.dev', icon: ShieldCheck },
  { label: 'Admin', email: 'admin@civita.dev', icon: UserCog },
];

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      void navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      const message = errorMessage(err);
      if (err instanceof ApiError && err.status === 401) {
        form.setError('password', { message });
      } else {
        toast.error(message);
      }
    }
  });

  const signInAsDemo = (email: string) => {
    form.setValue('email', email);
    form.setValue('password', 'Password123');
    void onSubmit();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Sign in to report and follow issues in your area.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          action={
            <Link
              to="/forgot-password"
              className="text-primary text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Sign in
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or try a demo account</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <Button
            key={a.email}
            type="button"
            variant="outline"
            className="h-auto flex-col gap-1.5 py-3"
            disabled={isSubmitting}
            onClick={() => signInAsDemo(a.email)}
          >
            <a.icon className="text-primary size-5" />
            <span className="text-xs">{a.label}</span>
          </Button>
        ))}
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        New to Civita?{' '}
        <Link
          to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}
          className="text-primary font-medium hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
