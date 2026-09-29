import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, errorMessage } from './api';

/**
 * Maps an API validation error onto form fields, falling back to a toast.
 * Returns the message for any error that isn't field-specific.
 */
export const applyServerErrors = <T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
) => {
  if (err instanceof ApiError && err.details) {
    let applied = false;
    for (const [field, messages] of Object.entries(err.details)) {
      if (field === '_' || !messages[0]) continue;
      setError(field as Path<T>, { type: 'server', message: messages[0] });
      applied = true;
    }
    if (applied) return;
  }
  toast.error(errorMessage(err));
};
