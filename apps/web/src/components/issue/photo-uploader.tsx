import { MAX_ISSUE_IMAGES, type IssueImage } from '@civita/shared';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api';
import { uploadImage } from '@/lib/images';
import { cn } from '@/lib/utils';

interface Pending {
  key: string;
  preview: string;
}

export const PhotoUploader = ({
  value,
  onChange,
}: {
  value: IssueImage[];
  onChange: (images: IssueImage[]) => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  // Uploads finish asynchronously; append to the latest list, not the one captured at start.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const remaining = MAX_ISSUE_IMAGES - value.length - pending.length;

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    if (list.length > remaining) toast.warning(`You can attach up to ${MAX_ISSUE_IMAGES} photos`);

    for (const file of list.slice(0, Math.max(0, remaining))) {
      const item = { key: crypto.randomUUID(), preview: URL.createObjectURL(file) };
      setPending((p) => [...p, item]);
      uploadImage(file)
        .then((img) => {
          latest.current = [...latest.current, img];
          onChange(latest.current);
        })
        .catch((err: unknown) => toast.error(`${file.name}: ${errorMessage(err)}`))
        .finally(() => {
          setPending((p) => p.filter((x) => x.key !== item.key));
          URL.revokeObjectURL(item.preview);
        });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((img, i) => (
          <div
            key={img.url}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border"
          >
            <img src={img.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v.url !== img.url))}
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-black/60 p-1 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.key} className="relative aspect-[4/3] overflow-hidden rounded-xl border">
            <img src={p.preview} alt="" className="size-full object-cover opacity-50 blur-[1px]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-white drop-shadow" />
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm transition-colors',
              dragging && 'border-primary bg-primary/5 text-primary',
              value.length + pending.length === 0 && 'col-span-2 aspect-auto py-12 sm:col-span-3',
            )}
          >
            <ImagePlus className="size-6" />
            <span className="font-medium">
              {value.length + pending.length === 0
                ? 'Drop photos here or click to browse'
                : 'Add more'}
            </span>
            <span className="text-xs opacity-80">
              JPEG, PNG or WebP · up to {MAX_ISSUE_IMAGES} photos
            </span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {pending.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
          Uploading {pending.length} {pending.length === 1 ? 'photo' : 'photos'}…
        </p>
      )}
    </div>
  );
};
