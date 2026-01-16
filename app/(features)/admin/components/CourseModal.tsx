"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Term {
  id: string;
  term: string;
  year: number;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  color: string;
  section: string | null;
  user: User;
  term: Term | null;
}

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onSave: () => void;
  terms: Term[];
  instructors: User[];
}

const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
];

export default function CourseModal({
  isOpen,
  onClose,
  course,
  onSave,
  terms,
  instructors,
}: CourseModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#10b981",
    section: "",
    termId: "",
    userId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        description: course.description || "",
        color: course.color,
        section: course.section || "",
        termId: course.term?.id || "",
        userId: course.user.id,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#10b981",
        section: "",
        termId: "",
        userId: "",
      });
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.userId) {
      toast.error("Course name and instructor are required");
      return;
    }

    setSaving(true);

    try {
      const url = course
        ? `/api/admin/courses/${course.id}`
        : "/api/admin/courses";
      
      const method = course ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
          section: formData.section.trim() || null,
          termId: formData.termId || null,
          userId: formData.userId,
        }),
      });

      if (response.ok) {
        toast.success(
          course ? "Course updated successfully" : "Course created successfully"
        );
        onSave();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save course");
      }
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {course ? "Edit Course" : "Add New Course"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Course Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., COSC 499"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Course description (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              Instructor*
            </label>
            <select
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select an instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name} ({instructor.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="termId" className="block text-sm font-medium text-gray-700 mb-1">
                Term
              </label>
              <select
                id="termId"
                name="termId"
                value={formData.termId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term} {term.year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                onChange={handleInputChange}
                placeholder="001, 002, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? "border-gray-800" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : course ? "Update Course" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}