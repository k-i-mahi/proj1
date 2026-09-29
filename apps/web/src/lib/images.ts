import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@civita/shared';
import { api } from './api';

const MAX_DIMENSION = 1920;

/**
 * Downscales large photos in the browser before upload. Phone photos are often
 * 4 to 8 MB; this typically brings them under 500 KB with no visible loss.
 */
export const compressImage = async (file: File): Promise<Blob> => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error('Only JPEG, PNG or WebP images are supported');
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 800 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
};

export const uploadImage = async (file: File) => {
  const blob = await compressImage(file);
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB');
  const form = new FormData();
  form.append(
    'file',
    blob,
    file.name.replace(/\.\w+$/, '') + (blob.type === 'image/webp' ? '.webp' : ''),
  );
  return api.post<{ url: string; publicId: string }>('/uploads/images', form);
};
