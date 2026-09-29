import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_IMAGE_BYTES } from '@civita/shared';
import { v2 as cloudinary } from 'cloudinary';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { randomToken } from '../../lib/tokens.js';
import { requireAuth } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rate-limit.js';

/** Local fallback storage when Cloudinary isn't configured, relative to the API package. */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const useCloudinary = Boolean(env.CLOUDINARY_URL);
if (useCloudinary) cloudinary.config({ secure: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

/**
 * Detects the real image type from magic bytes rather than trusting the
 * client-supplied MIME type or file extension.
 */
export const sniffImageType = (buf: Buffer): 'jpg' | 'png' | 'webp' | null => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
};

const uploadToCloudinary = (buf: Buffer) =>
  new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'civita/issues',
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 1920, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      )
      .end(buf);
  });

export const uploadsRouter = Router();

uploadsRouter.post(
  '/images',
  requireAuth,
  uploadLimiter,
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) throw new AppError(400, 'UPLOAD_ERROR', 'Attach an image in the "file" field');
    const ext = sniffImageType(file.buffer);
    if (!ext) throw new AppError(400, 'UPLOAD_ERROR', 'Only JPEG, PNG or WebP images are allowed');

    if (useCloudinary) {
      res.status(201).json(await uploadToCloudinary(file.buffer));
      return;
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now()}-${randomToken(12)}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, name), file.buffer);
    res
      .status(201)
      .json({ url: `${env.API_PUBLIC_URL}/uploads/${name}`, publicId: `local/${name}` });
  },
);
