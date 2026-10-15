'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUploadSuccess: (avatarUrl: string) => void;
  onRemove?: () => void;
}

export default function AvatarUpload({ currentAvatar, onUploadSuccess, onRemove }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Retry upload with exponential backoff
  const uploadWithRetry = useCallback(
    async (file: File, attempt = 1): Promise<any> => {
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/users/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw { response: { status: response.status, data: error } };
        }

        return await response.json();
      } catch (error: any) {
        // Don't retry on 4xx errors (validation, auth, etc.)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Retry on 5xx or network errors (up to 3 attempts)
        if (attempt < 3) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return uploadWithRetry(file, attempt + 1);
        }

        throw error;
      }
    },
    []
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size exceeds 5MB limit');
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      try {
        setUploading(true);
        setError(null);

        const data = await uploadWithRetry(file);
        onUploadSuccess(data.avatar);
        setPreview(null);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || (err instanceof Error ? err.message : 'Upload failed');
        setError(errorMessage);
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess, uploadWithRetry]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleRemove = async () => {
    if (!onRemove) return;

    try {
      setUploading(true);
      setError(null);

      const response = await fetch('/api/users/avatar', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }
      onRemove();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Remove failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-moss-200 bg-moss-100 flex items-center justify-center">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={48} className="text-moss-400" />
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-moss-500 bg-moss-50'
                : 'border-moss-300 hover:border-moss-400 hover:bg-moss-50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="mx-auto mb-2 text-moss-600" />
            {isDragActive ? (
              <p className="text-moss-700 font-medium">Drop image here...</p>
            ) : (
              <div>
                <p className="text-moss-900 font-semibold mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-moss-600">
                  JPEG, PNG or WebP (max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Remove Button */}
          {currentAvatar && !preview && onRemove && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <X size={16} />
              Remove Picture
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
