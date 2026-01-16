"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: Date | null;
  image?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

export default function EditUserModal({ isOpen, user, onClose, onUserUpdated }: EditUserModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    role: 'TEACHER',
    emailVerified: null as Date | null,
    image: ''
  });

  // Image handling state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Constants for image validation
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified || null,
        image: user.image || ''
      });
      setImagePreview(user.image || '');
      setSelectedImage(null);
      
      // Fetch fresh user data
      fetchUserData(user.id);
    }
  }, [user]);

  const fetchUserData = async (userId: string) => {
    try {
      setImageLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      
      if (response.ok) {
        const userData = await response.json();
        setFormData({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          emailVerified: userData.emailVerified ? new Date(userData.emailVerified) : null,
          image: userData.image || ''
        });
        setImagePreview(userData.image || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'status') {
      // Convert status to emailVerified
      setFormData(prev => ({
        ...prev,
        emailVerified: value === 'verified' ? new Date() : null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP formats are allowed');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    if (!saving) {
      setSelectedImage(null);
      setImagePreview('');
      onClose();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('emailVerified', formData.emailVerified ? 'true' : 'false');
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      const response = await fetch(`/api/admin/users/${formData.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Emit event to notify sidebar and other components about the user update
        window.dispatchEvent(
          new CustomEvent("user-updated", {
            detail: { 
              type: "user-edited", 
              timestamp: Date.now(),
              user: updatedUser 
            },
          })
        );
        
        toast.success('User updated successfully!');
        onUserUpdated();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
            <button
              onClick={handleClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Update user details and permissions
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="space-y-6">
            {/* User Avatar */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0 relative">
                <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg bg-gray-100 flex items-center justify-center">
                  {imageLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt=""
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {formData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
                  disabled={saving}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{formData.name}</h3>
                <p className="text-sm text-gray-500">User ID: {formData.id}</p>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG or WEBP (max 2MB)
                </p>
                {selectedImage && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-700">
                        New photo selected. Click save to update.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                User Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ADMIN">Administrator</option>
                <option value="TEACHER">Teacher/Professor</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.emailVerified ? 'verified' : 'unverified'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="verified">Active</option>
                <option value="unverified">Inactive</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Inactive accounts cannot log in to the system
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 