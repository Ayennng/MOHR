'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Building, Shield, Save, ArrowLeft } from 'lucide-react';
import AvatarUpload from '@/components/profile/avatar-upload';
import ChangePasswordForm from '@/components/profile/change-password-form';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  phone?: string;
  avatar?: string;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        department: data.department || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess(true);

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: `${updatedProfile.firstName} ${updatedProfile.lastName}`,
        },
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (avatarUrl: string) => {
    try {
      // Update local profile state immediately for UI feedback
      setProfile((prev) => prev ? { ...prev, avatar: avatarUrl } : null);

      // Update session with new avatar
      // Only pass the updated user object, not the entire session
      await update({
        user: {
          ...session?.user,
          image: avatarUrl,
        },
      });
    } catch (err) {
      console.error('Failed to update session after avatar upload:', err);
      // Refetch profile to ensure DB consistency
      await fetchProfile();
    }
  };

  const handleAvatarRemove = async () => {
    try {
      setProfile((prev) => prev ? { ...prev, avatar: undefined } : null);

      // Update session to remove avatar
      await update({
        user: {
          ...session?.user,
          image: null,
        },
      });
    } catch (err) {
      console.error('Failed to update session after avatar removal:', err);
      // Refetch profile to ensure DB consistency
      await fetchProfile();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        <p className="font-semibold">Error</p>
        <p className="text-sm mt-1">{error || 'Failed to load profile'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-moss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-moss-500 to-moss-600 px-8 py-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/20 hover:border-white/30 backdrop-blur-sm"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 text-white/90 text-sm font-medium mb-2">
              <User size={16} />
              MY PROFILE
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Profile Settings
            </h1>
            <p className="text-moss-50">Manage your personal information and preferences</p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 shadow-sm">
            <p className="font-semibold flex items-center gap-2">
              <span className="text-emerald-500">✓</span> Profile updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 shadow-sm">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Picture */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
              <h2 className="text-lg font-bold text-moss-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
                Profile Picture
              </h2>
              <AvatarUpload
                currentAvatar={profile.avatar}
                onUploadSuccess={handleAvatarUpload}
                onRemove={handleAvatarRemove}
              />
              
              {/* Profile Summary */}
              <div className="mt-6 pt-6 border-t border-moss-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-moss-100 flex items-center justify-center">
                      <Mail size={16} className="text-moss-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-moss-600 font-medium">Email</p>
                      <p className="text-sm text-moss-900 truncate">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-moss-100 flex items-center justify-center">
                      <Shield size={16} className="text-moss-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-moss-600 font-medium">Role</p>
                      <p className="text-sm text-moss-900">{profile.role}</p>
                    </div>
                  </div>
                  {profile.department && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-moss-100 flex items-center justify-center">
                        <Building size={16} className="text-moss-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-moss-600 font-medium">Department</p>
                        <p className="text-sm text-moss-900">{profile.department}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Personal Information Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-moss-100 p-6">
              <h2 className="text-lg font-bold text-moss-900 mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-moss-500 rounded-full"></div>
                Personal Information
              </h2>

              <div className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-moss-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-moss-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-moss-200 rounded-lg bg-moss-50/50 text-moss-600 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-moss-500 bg-moss-100 px-2 py-1 rounded">
                      Read-only
                    </span>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 border border-moss-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent transition-all text-moss-900"
                    placeholder="e.g., Engineering, HR, Sales"
                  />
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-moss-700 mb-2">
                    Role
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.role}
                      disabled
                      className="w-full px-4 py-2.5 border border-moss-200 rounded-lg bg-moss-50/50 text-moss-600 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-moss-500 bg-moss-100 px-2 py-1 rounded">
                      Managed by admin
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-moss-100">
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="px-6 py-2.5 border border-moss-200 text-moss-700 rounded-lg font-medium hover:bg-moss-50 transition-colors"
                >
                  Reset
                </button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="px-8 py-2.5 bg-gradient-to-r from-moss-500 to-moss-600 text-white rounded-lg font-medium hover:from-moss-600 hover:to-moss-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </Button>
              </div>
            </form>

            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
