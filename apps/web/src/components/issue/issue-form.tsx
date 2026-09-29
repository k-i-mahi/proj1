import { createIssueSchema, type CreateIssueInput, type IssueImage } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import type { z } from 'zod';
import { useCategories } from '@/hooks/queries';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CategoryGlyph, CategoryPill } from '../domain';
import { Button } from '../ui/button';
import { Field, Input, Textarea } from '../ui/form-controls';
import { Card, Skeleton } from '../ui/primitives';
import { PhotoUploader } from './photo-uploader';

const LocationPicker = lazy(() =>
  import('../map/location-picker').then((m) => ({ default: m.LocationPicker })),
);

type FormValues = z.input<typeof createIssueSchema>;

const STEPS = [
  { id: 'details', label: 'Details', icon: FileText, fields: ['category', 'title', 'description'] },
  { id: 'location', label: 'Location', icon: MapPin, fields: ['location', 'address'] },
  { id: 'photos', label: 'Photos', icon: ImageIcon, fields: ['images'] },
  { id: 'review', label: 'Review', icon: Check, fields: [] },
] as const;

const Stepper = ({ step, onJump }: { step: number; onJump: (i: number) => void }) => (
  <ol className="mb-8 flex items-center gap-2">
    {STEPS.map((s, i) => {
      const done = i < step;
      const current = i === step;
      return (
        <li key={s.id} className="flex flex-1 items-center gap-2 last:flex-none">
          <button
            type="button"
            disabled={i > step}
            onClick={() => onJump(i)}
            className="group flex cursor-pointer items-center gap-2 disabled:cursor-default"
            aria-current={current ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                done && 'border-primary bg-primary text-primary-foreground',
                current && 'border-primary text-primary ring-primary/15 ring-4',
                !done && !current && 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm font-medium sm:inline',
                !current && 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            <span
              className={cn('h-px flex-1 transition-colors', done ? 'bg-primary' : 'bg-border')}
            />
          )}
        </li>
      );
    })}
  </ol>
);

export const IssueForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<FormValues>;
  submitLabel: string;
  onSubmit: (values: CreateIssueInput) => Promise<void>;
}) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { data: categories, isPending: loadingCategories } = useCategories();
  const form = useForm<FormValues>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: { title: '', description: '', images: [], address: '', ...initial },
    mode: 'onTouched',
  });
  const { errors, isSubmitting } = form.formState;
  const location = form.watch('location');
  const values = form.watch();

  // Fill the address from the pin, unless the user has typed their own.
  const reverse = useQuery({
    queryKey: ['geo-reverse', location?.lat.toFixed(5), location?.lng.toFixed(5)],
    queryFn: async () => {
      const res = await api.get<{ address: string }>('/geo/reverse', {
        lat: location!.lat,
        lng: location!.lng,
      });
      const moved = form.getFieldState('location').isDirty;
      if (moved && !form.getFieldState('address').isDirty) form.setValue('address', res.address);
      return res;
    },
    enabled: !!location,
    staleTime: Infinity,
  });

  const go = async (next: number) => {
    if (next > step) {
      const fields = STEPS[step]!.fields as readonly FieldPath<FormValues>[];
      const ok = await form.trigger(fields as FieldPath<FormValues>[], { shouldFocus: true });
      if (!ok) return;
    }
    setDirection(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = form.handleSubmit(async (v) => {
    await onSubmit(v);
  });

  const category = categories?.find((c) => c.id === values.category);

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper step={step} onJump={(i) => void go(i)} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) void go(step + 1);
          else void submit();
        }}
        noValidate
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <p className="text-sm font-medium">What kind of issue is it?</p>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <div
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                        role="radiogroup"
                        aria-label="Category"
                      >
                        {loadingCategories
                          ? Array.from({ length: 8 }, (_, i) => (
                              <Skeleton key={i} className="h-24 rounded-xl" />
                            ))
                          : categories?.map((c) => {
                              const active = field.value === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  onClick={() => field.onChange(c.id)}
                                  className={cn(
                                    'bg-card flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm',
                                    active
                                      ? 'border-primary ring-primary/15 ring-4'
                                      : 'hover:border-primary/40',
                                  )}
                                >
                                  <CategoryGlyph icon={c.icon} color={c.color} className="size-9" />
                                  <span className="text-sm leading-tight font-medium">
                                    {c.name}
                                  </span>
                                </button>
                              );
                            })}
                      </div>
                    )}
                  />
                  {errors.category && (
                    <p className="text-destructive text-xs font-medium">Choose a category</p>
                  )}
                </div>
                <Field
                  label="Title"
                  htmlFor="title"
                  error={errors.title?.message}
                  hint="A short summary, e.g. “Deep pothole outside the school gate”"
                >
                  <Input
                    id="title"
                    maxLength={120}
                    aria-invalid={!!errors.title}
                    {...form.register('title')}
                  />
                </Field>
                <Field
                  label="Description"
                  htmlFor="description"
                  error={errors.description?.message}
                  hint={`${values.description?.length ?? 0}/4000 · What is wrong, how long has it been like this, who is affected?`}
                >
                  <Textarea
                    id="description"
                    rows={6}
                    maxLength={4000}
                    aria-invalid={!!errors.description}
                    {...form.register('description')}
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5">
                <Controller
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <Suspense fallback={<Skeleton className="h-[420px] rounded-2xl" />}>
                      <LocationPicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        className="h-[420px]"
                      />
                    </Suspense>
                  )}
                />
                {errors.location && (
                  <p className="text-destructive -mt-3 text-xs font-medium">
                    Drop a pin where the issue is
                  </p>
                )}
                <Field
                  label="Address or landmark"
                  htmlFor="address"
                  error={errors.address?.message}
                  hint={
                    reverse.isFetching
                      ? 'Looking up the address…'
                      : 'Filled in from the pin; edit it to add a landmark.'
                  }
                  action={
                    reverse.isFetching ? (
                      <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                    ) : null
                  }
                >
                  <Input
                    id="address"
                    maxLength={300}
                    placeholder="e.g. Opposite KUET main gate"
                    {...form.register('address')}
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3">
                <p className="text-sm font-medium">Add photos</p>
                <p className="text-muted-foreground -mt-2 text-sm">
                  Photos help authorities understand and prioritise the issue. They&apos;re
                  optional.
                </p>
                <Controller
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <PhotoUploader
                      value={(field.value ?? []) as IssueImage[]}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <Card className="overflow-hidden">
                {values.images?.[0] && (
                  <img src={values.images[0].url} alt="" className="h-56 w-full object-cover" />
                )}
                <div className="p-6">
                  {category && <CategoryPill category={category} />}
                  <h2 className="mt-3 text-xl font-semibold">{values.title}</h2>
                  <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                    {values.description}
                  </p>
                  <div className="bg-muted/50 mt-5 flex items-start gap-2 rounded-lg p-3 text-sm">
                    <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>
                      {values.address ||
                        `${values.location?.lat.toFixed(5)}, ${values.location?.lng.toFixed(5)}`}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs">
                    {values.images?.length ?? 0} {values.images?.length === 1 ? 'photo' : 'photos'}{' '}
                    attached. You&apos;ll automatically follow this issue and get notified of
                    updates.
                  </p>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void go(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="submit">
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button type="submit" variant="gradient" loading={isSubmitting}>
              {!isSubmitting && <Send />} {submitLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
