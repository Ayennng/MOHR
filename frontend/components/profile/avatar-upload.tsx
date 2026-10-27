/* eslint-disable @next/next/no-img-element -- previews are data: URLs and avatars come from our authenticated /api/files route */
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';

const MAX_BYTES = 5 * 1024 * 1024;

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
    if (file.size > MAX_BYTES) return setError('File size exceeds 5MB limit');

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
        <div className="relative grid size-32 shrink-0 place-items-center overflow-hidden rounded-full bg-mint-200 ring-4 ring-white shadow-soft">
          {shown ? <img src={shown} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={44} className="text-mint-800" />}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-mint-950/50 text-mint-100 animate-fade">
              <Spinner />
            </div>
          )}
        </div>

        <div className="flex-1 w-full">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-[border-color,background-color,transform] duration-200 ease-out-soft ${
              isDragActive ? 'scale-[1.02] border-mint-600 bg-mint-100' : 'border-mint-900/20 hover:border-mint-600 hover:bg-mint-50'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="mx-auto mb-2 text-mint-700" />
            <p className="text-mint-900 font-semibold mb-1">
              {isDragActive ? 'Drop image here...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-mint-700">JPEG, PNG or WebP (max 5MB)</p>
          </div>

          {currentAvatar && !preview && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <X size={16} />
              Remove Picture
            </button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
    </div>
  );
}
