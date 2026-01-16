"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../components/layouts/SimpleLayout";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";

// Update the template type definition
interface Template {
  id: string;
  name: string;
  description: string;
  sections: {
    id: string;
    name: string;
    questionCount: number;
  }[];
  totalQuestions: number;
  color: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

export default function CourseTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTemplates();
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);

  // Obtain the template list (actual API invocation)
  const fetchTemplates = async () => {
    try {
      setLoading(true);

      // Call the API to obtain the template data
      const response = await fetch(`/api/templates?courseId=${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Get course information
  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");

      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const handleCreateTemplate = () => {
    const url = `/course/${courseId}/templates/playground${
      isSidebarAccess ? "?sidebar=true" : ""
    }`;
    router.push(url);
  };

  const handleEditTemplate = (template: Template) => {
    // Navigate to combined editor with templateId for editing
    const queryParams = new URLSearchParams();
    queryParams.set("templateId", template.id);
    if (isSidebarAccess) queryParams.set("sidebar", "true");

    const url = `/course/${courseId}/templates/playground/edit?${queryParams.toString()}`;
    router.push(url);
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/templates/${templateToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted successfully!");
      fetchTemplates(); // Reload the template list
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openDeleteModal = (id: string) => {
    setTemplateToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleViewTemplate = (templateId: string) => {
    const url = `/course/${courseId}/templates/${templateId}${
      isSidebarAccess ? "?sidebar=true" : ""
    }`;
    router.push(url);
  };

  const handleUseTemplate = (template: Template) => {
    // Navigate directly to exam playground with template auto-loaded
    const url = `/course/${courseId}/exams/playground?templateId=${
      template.id
    }${isSidebarAccess ? "&sidebar=true" : ""}`;
    router.push(url);
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Templates"
        description="Create reusable exam templates for future terms"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="templates" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
  }

  const content = (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: "#363636", color: "#fff" },
          success: {
            duration: 2000,
            style: { background: "#4aed88", color: "#fff" },
          },
          error: {
            duration: 3000,
            style: { background: "#ff4b4b", color: "#fff" },
          },
        }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Templates</h1>
            <p className="text-gray-600 mt-2">
              Create reusable exam templates for consistent assessments across
              terms
            </p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="bg-brand-navy text-white px-6 py-3 rounded-lg hover:bg-navy-800 transition-colors font-medium flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>Create Template</span>
          </button>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Custom Structure
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Define exam structure with multiple sections and flexible
              formatting.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Section Organization
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Organize questions into logical sections with specific parameters.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Smart Selection
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Set rules for question selection based on difficulty, topic, or
              manual picks.
            </p>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first exam template to standardize your exam creation
              process across terms.
            </p>
            <button
              onClick={handleCreateTemplate}
              className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex flex-col h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: template.color }}
                      ></div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {template.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                      title="Edit Template"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-4">
                      {template.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{template.totalQuestions} questions</span>
                    </div>

                    {/* Creation date */}
                    <div className="text-xs text-gray-400 mt-auto">
                      Created:{" "}
                      {new Date(template.createdAt).toLocaleDateString()}
                      {template.updatedAt !== template.createdAt && (
                        <span className="ml-2">
                          (Updated:{" "}
                          {new Date(template.updatedAt).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors text-sm font-medium"
                    >
                      Create Exam Using Template
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewTemplate(template.id)}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openDeleteModal(template.id)}
                        className="flex-1 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );

  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Templates"
      description="Create reusable exam templates for future terms"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="templates">
      {content}
    </CourseLayout>
  );
}
