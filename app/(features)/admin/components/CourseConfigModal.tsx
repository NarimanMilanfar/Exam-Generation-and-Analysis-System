"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CourseConfigRequest } from "../../../types/courseConfig";

interface Course {
  id: string;
  name: string;
  description: string | null;
  color: string;
  section: string | null;
}

interface CourseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onSave: () => void;
}

const DEFAULT_CONFIG: CourseConfigRequest = {
  defaultQuestionCount: 20,
  defaultFormat: 'MCQ',
  weightPerQuestion: 1.0,
  negativeMarking: false,
  allowInstructorOverride: true,
};

export default function CourseConfigModal({
  isOpen,
  onClose,
  course,
  onSave,
}: CourseConfigModalProps) {
  const [config, setConfig] = useState<CourseConfigRequest>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      fetchConfig();
    }
  }, [isOpen, course]);

  const fetchConfig = async () => {
    if (!course) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/courses/${course.id}/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || DEFAULT_CONFIG);
      } else if (response.status === 404) {
        // No config exists yet, use defaults
        setConfig(DEFAULT_CONFIG);
      } else {
        toast.error('Failed to load course configuration');
      }
    } catch (error) {
      console.error('Error fetching course config:', error);
      toast.error('Failed to load course configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Course configuration saved successfully!');
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (field: keyof CourseConfigRequest, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Course Configuration</h2>
              <p className="text-gray-600 mt-1">
                Configure exam defaults for <span className="font-medium">{course.name}</span>
                {course.section && <span className="text-gray-500"> (Section {course.section})</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="defaultQuestionCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Number of Questions
                </label>
                <input
                  type="number"
                  id="defaultQuestionCount"
                  min="1"
                  max="100"
                  value={config.defaultQuestionCount}
                  onChange={(e) => handleConfigChange('defaultQuestionCount', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="defaultFormat" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Format
                </label>
                <select
                  id="defaultFormat"
                  value={config.defaultFormat}
                  onChange={(e) => handleConfigChange('defaultFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MCQ">Multiple Choice Questions (MCQ)</option>
                  <option value="TrueFalse">True/False</option>
                  <option value="Mixed">Mixed Format</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Marking Scheme</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="weightPerQuestion" className="block text-sm font-medium text-gray-700 mb-2">
                    Weight per Question
                  </label>
                  <input
                    type="number"
                    id="weightPerQuestion"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={config.weightPerQuestion}
                    onChange={(e) => handleConfigChange('weightPerQuestion', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Marking
                  </label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="negativeMarking"
                        checked={config.negativeMarking === true}
                        onChange={() => handleConfigChange('negativeMarking', true)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Enabled</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="negativeMarking"
                        checked={config.negativeMarking === false}
                        onChange={() => handleConfigChange('negativeMarking', false)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Disabled</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Instructor Permissions</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowInstructorOverride"
                  checked={config.allowInstructorOverride}
                  onChange={(e) => handleConfigChange('allowInstructorOverride', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allowInstructorOverride" className="ml-2 text-sm text-gray-700">
                  Allow instructors to override these defaults for individual exams
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                When unchecked, instructors will be required to use these settings for all exams in this course.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}

        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Configuration Notes
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>These settings will apply as defaults for new exams created in this course</li>
                    <li>Instructors can override these settings when creating individual exams (if permission is granted)</li>
                    <li>Changes to these settings do not affect existing exams</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}