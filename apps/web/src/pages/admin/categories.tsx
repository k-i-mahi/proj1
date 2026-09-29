import { categorySchema, type Category } from '@civita/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, PencilLine, Plus, Tags, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { CATEGORY_ICONS, CategoryGlyph, CategoryIcon } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Field, Input, Switch } from '@/components/ui/form-controls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/overlays';
import { Card, Skeleton } from '@/components/ui/primitives';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useCategories, useDeleteCategory, useSaveCategory } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { cn } from '@/lib/utils';

type Values = z.input<typeof categorySchema>;

const SWATCHES = [
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#64748b',
];

const CategoryDialog = ({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}) => {
  const save = useSaveCategory();
  const form = useForm<Values>({ resolver: zodResolver(categorySchema) });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              name: category.name,
              description: category.description,
              icon: category.icon,
              color: category.color,
              isActive: category.isActive,
              order: category.order,
            }
          : {
              name: '',
              description: '',
              icon: 'circle-alert',
              color: '#6366f1',
              isActive: true,
              order: 0,
            },
      );
    }
  }, [open, category, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ ...(category ? { id: category.id } : {}), ...values });
      toast.success(category ? 'Category updated' : 'Category created');
      onOpenChange(false);
    } catch (err) {
      applyServerErrors(err, form.setError);
    }
  });

  const color = form.watch('color') ?? '#6366f1';
  const icon = form.watch('icon') ?? 'circle-alert';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>Categories help route issues to the right team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <div className="flex items-center gap-3">
            <CategoryGlyph
              icon={icon}
              color={color}
              className="size-12 rounded-xl"
              iconClassName="size-6"
            />
            <Field label="Name" htmlFor="cat-name" error={errors.name?.message} className="flex-1">
              <Input id="cat-name" aria-invalid={!!errors.name} {...form.register('name')} />
            </Field>
          </div>
          <Field label="Description" htmlFor="cat-desc" error={errors.description?.message}>
            <Input id="cat-desc" {...form.register('description')} />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Icon</p>
            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => (
                <div className="grid grid-cols-10 gap-1.5">
                  {Object.keys(CATEGORY_ICONS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => field.onChange(key)}
                      className={cn(
                        'hover:bg-accent flex aspect-square cursor-pointer items-center justify-center rounded-md border',
                        field.value === key && 'border-primary bg-primary/10 text-primary',
                      )}
                      aria-label={key}
                      aria-pressed={field.value === key}
                    >
                      <CategoryIcon icon={key} className="size-4" />
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Colour</p>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      className={cn(
                        'size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--popover)]',
                        field.value === c && 'ring-2 ring-[var(--foreground)]',
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                      aria-pressed={field.value === c}
                    />
                  ))}
                </div>
              )}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="text-muted-foreground block text-xs">
                Inactive categories can&apos;t be chosen for new reports.
              </span>
            </span>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {category ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function CategoriesPage() {
  useDocumentTitle('Categories');
  const { data, isPending, error, refetch } = useCategories(true);
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  const openDialog = (category: Category | null) => {
    setEditing(category);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Define the kinds of issues residents can report."
        actions={
          <Button onClick={() => openDialog(null)}>
            <Plus /> New category
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create one so residents can start reporting."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className={cn('p-5', !c.isActive && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <CategoryGlyph
                  icon={c.icon}
                  color={c.color}
                  className="size-10 rounded-xl"
                  iconClassName="size-5"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {c.description || 'No description'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openDialog(c)}>
                      <PencilLine /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      destructive
                      disabled={c.issueCount > 0}
                      onSelect={() =>
                        remove.mutate(c.id, {
                          onSuccess: () => toast.success('Category deleted'),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                    >
                      <Trash2 /> {c.issueCount > 0 ? 'In use, deactivate instead' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
                <span>
                  <span className="text-foreground font-medium">{c.issueCount}</span> issues
                </span>
                {!c.isActive && (
                  <span className="bg-muted rounded-full px-2 py-0.5 font-medium">Inactive</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <CategoryDialog open={open} onOpenChange={setOpen} category={editing} />
    </div>
  );
}
