/* eslint-disable @next/next/no-img-element -- previews are data: URLs and avatars come from our authenticated /api/files route */
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';

const MAX_BYTES = 4 * 1024 * 1024;

/** Drop zone that uploads a new profile picture, plus a remove button. Reports the new avatar URL (or null). */
export default function AvatarUpload({
  currentAvatar,
  onChange,
}: {
  currentAvatar?: string | null;
  onChange: (avatar: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<string | null>) => {
    setUploading(true);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setUploading(false);
      setPreview(null);
    }
  };

  const upload = (file: File) => {
    if (file.size > MAX_BYTES) return setError('File size exceeds 4MB limit');

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);
    run(async () => (await api<{ avatar: string }>('/api/users/avatar', { method: 'POST', body: formData })).avatar);
  };

  const remove = () => run(async () => (await api('/api/users/avatar', { method: 'DELETE' }), null));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: ([file]) => file && upload(file),
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const shown = preview || currentAvatar;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100">
          {shown ? <img src={shown} alt="Profile" className="h-full w-full object-cover" /> : <Camera size={28} className="text-ink-400" />}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-ink-950/50 text-white animate-fade">
              <Spinner />
            </div>
          )}
        </div>

        <div className="flex-1 w-full">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-xl border border-dashed p-5 text-center transition-[border-color,background-color] duration-150 ease-out-soft ${
              isDragActive ? 'border-mint-600 bg-mint-50' : 'border-ink-900/20 hover:border-ink-900/40 hover:bg-ink-50'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload size={20} className="mx-auto mb-2 text-ink-400" />
            <p className="text-sm font-medium text-ink-900">{isDragActive ? 'Drop to upload' : 'Upload a photo'}</p>
            <p className="mt-0.5 text-xs text-ink-500">JPEG, PNG or WebP, up to 4MB</p>
          </div>

          {currentAvatar && !preview && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="mx-auto mt-3 flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-rose-700 transition-colors duration-150 hover:bg-rose-50 disabled:opacity-50"
            >
              <X size={14} />
              Remove photo
            </button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
    </div>
  );
}
