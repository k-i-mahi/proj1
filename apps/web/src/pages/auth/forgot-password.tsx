import { forgotPasswordSchema, type ForgotPasswordInput } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { useDocumentTitle } from '@/hooks/misc';
import { api, errorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset password');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await api.post('/auth/forgot-password', { email });
      setSentTo(email);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          If an account exists for <span className="text-foreground font-medium">{sentTo}</span>,
          we&apos;ve sent a link to reset your password. It expires in 30 minutes.
        </p>
        <Button variant="outline" className="mt-8 w-full" asChild>
          <Link to="/login">
            <ArrowLeft /> Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Forgot your password?</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Enter your email and we&apos;ll send you a secure link to choose a new one.
      </p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-5" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <Button variant="ghost" className="mt-6 w-full" asChild>
        <Link to="/login">
          <ArrowLeft /> Back to sign in
        </Link>
      </Button>
    </div>
  );
}
