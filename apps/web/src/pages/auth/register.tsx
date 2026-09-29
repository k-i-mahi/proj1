import { registerSchema, type RegisterInput } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PasswordStrength } from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { useDocumentTitle } from '@/hooks/misc';
import { applyServerErrors } from '@/lib/forms';
import { useAuth } from '@/providers/auth';
import { safeNext } from '@/lib/utils';

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });
  const { errors, isSubmitting } = form.formState;
  const password = form.watch('password');

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await signUp(values);
      toast.success(`Welcome to Civita, ${user.name.split(' ')[0]}!`);
      void navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      applyServerErrors(err, form.setError);
      if (err instanceof Error && /already exists/i.test(err.message)) {
        form.setError('email', { message: err.message });
      }
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Join your neighbours in making the city better.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Tanvir Ahmed"
            aria-invalid={!!errors.name}
            {...form.register('name')}
          />
        </Field>
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
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </Field>
        <PasswordStrength password={password} />
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Create account
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          By signing up you agree to keep reports honest and respectful.
        </p>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
