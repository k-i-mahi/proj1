import { passwordSchema } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LinkIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordStrength } from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { EmptyState } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { api, errorMessage } from '@/lib/api';

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export default function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (token.length < 32) {
    return (
      <EmptyState
        icon={LinkIcon}
        title="This link isn't valid"
        description="Reset links expire after 30 minutes and can only be used once. Request a fresh one."
        action={
          <Button asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        }
      />
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. Sign in with your new password.');
      void navigate('/login', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <div>
      <div className="bg-primary/10 text-primary mb-6 flex size-12 items-center justify-center rounded-2xl">
        <KeyRound className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        You&apos;ll be signed out of all other devices.
      </p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-5" noValidate>
        <Field label="New password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </Field>
        <PasswordStrength password={form.watch('password')} />
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...form.register('confirm')}
          />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
