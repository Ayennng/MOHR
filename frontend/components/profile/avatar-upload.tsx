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
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-32 h-32 shrink-0 rounded-full overflow-hidden border-4 border-moss-200 bg-moss-100 flex items-center justify-center">
          {shown ? <img src={shown} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={48} className="text-moss-400" />}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
              <Spinner />
            </div>
          )}
        </div>

        <div className="flex-1 w-full">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-moss-500 bg-moss-50' : 'border-moss-300 hover:border-moss-400 hover:bg-moss-50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="mx-auto mb-2 text-moss-600" />
            <p className="text-moss-900 font-semibold mb-1">
              {isDragActive ? 'Drop image here...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-moss-600">JPEG, PNG or WebP (max 5MB)</p>
          </div>

          {currentAvatar && !preview && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
