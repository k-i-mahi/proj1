import {
  changePasswordSchema,
  updateMeSchema,
  type ChangePasswordInput,
  type User,
} from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordStrength } from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form-controls';
import {
  Avatar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/primitives';
import { PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { uploadImage } from '@/lib/images';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth';
import { useTheme, type Theme } from '@/providers/theme';

const profileSchema = updateMeSchema
  .required({ name: true })
  .extend({ bio: z.string().trim().max(280) });
type ProfileValues = z.infer<typeof profileSchema>;

const ProfileCard = ({ user }: { user: User }) => {
  const { setUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, bio: user.bio, avatarUrl: user.avatarUrl },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const avatarUrl = form.watch('avatarUrl');

  const save = form.handleSubmit(async (values) => {
    try {
      const updated = await api.patch<User>('/users/me', values);
      setUser(updated);
      form.reset({ name: updated.name, bio: updated.bio, avatarUrl: updated.avatarUrl });
      toast.success('Profile saved');
    } catch (err) {
      applyServerErrors(err, form.setError);
    }
  });

  const onAvatar = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      form.setValue('avatarUrl', url, { shouldDirty: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>This is how other residents see you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-5" noValidate>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                name={form.watch('name') || user.name}
                src={avatarUrl}
                className="size-16 text-lg"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="bg-primary text-primary-foreground ring-card absolute -right-1 -bottom-1 cursor-pointer rounded-full p-1.5 ring-2"
                aria-label="Change photo"
              >
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={uploading}
                onClick={() => fileInput.current?.click()}
              >
                Upload photo
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue('avatarUrl', null, { shouldDirty: true })}
                >
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onAvatar(file);
                e.target.value = '';
              }}
            />
          </div>
          <Field label="Name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...form.register('name')} />
          </Field>
          <Field
            label="Email"
            htmlFor="email"
            hint="Your email is private and never shown to other users."
          >
            <Input id="email" value={user.email} disabled readOnly />
          </Field>
          <Field
            label="Bio"
            htmlFor="bio"
            error={errors.bio?.message}
            hint={`${form.watch('bio')?.length ?? 0}/280`}
          >
            <Textarea
              id="bio"
              rows={3}
              maxLength={280}
              placeholder="A line about you and your neighbourhood"
              {...form.register('bio')}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const passwordFormSchema = changePasswordSchema
  .extend({ confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

const PasswordCard = () => {
  const form = useForm<ChangePasswordInput & { confirm: string }>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const save = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      form.reset();
      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      applyServerErrors(err, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing your password signs you out on every other device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-5" noValidate>
          <Field
            label="Current password"
            htmlFor="currentPassword"
            error={errors.currentPassword?.message}
          >
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message}>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...form.register('newPassword')}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm?.message}>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...form.register('confirm')}
              />
            </Field>
          </div>
          {form.watch('newPassword') && <PasswordStrength password={form.watch('newPassword')} />}
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AppearanceCard = () => {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how Civita looks on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={theme === o.value}
              onClick={() => setTheme(o.value)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
                theme === o.value
                  ? 'border-primary ring-primary/15 text-primary ring-4'
                  : 'hover:border-primary/40',
              )}
            >
              <o.icon className="size-5" />
              {o.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />
      <div className="space-y-6">
        <ProfileCard user={user} />
        <PasswordCard />
        <AppearanceCard />
      </div>
    </div>
  );
}
