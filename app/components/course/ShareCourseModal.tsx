"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Collaborator {
  id: string;
  userId: string;
  courseId: string;
  role: 'VIEWER' | 'EDITOR';
  createdAt: string;
  user: User;
}

interface ShareCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
}

export default function ShareCourseModal({ 
  isOpen, 
  onClose, 
  courseId, 
  courseName 
}: ShareCourseModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCollaborators, setFetchingCollaborators] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, courseId]);

  const fetchCollaborators = async () => {
    setFetchingCollaborators(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/collaborators`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      } else {
        toast.error("Failed to fetch collaborators");
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      toast.error("Failed to fetch collaborators");
    } finally {
      setFetchingCollaborators(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (response.ok) {
        const newCollaborator = await response.json();
        setCollaborators([...collaborators, newCollaborator]);
        setEmail("");
        setRole('VIEWER');
        toast.success("Collaborator added successfully!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to add collaborator");
      }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Failed to add collaborator");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
        toast.success("Collaborator removed successfully!");
      } else {
        toast.error("Failed to remove collaborator");
      }
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Failed to remove collaborator");
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: 'VIEWER' | 'EDITOR') => {
    try {
      const response = await fetch(`/api/courses/${courseId}/collaborators/${collaboratorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setCollaborators(collaborators.map(c => 
          c.id === collaboratorId ? { ...c, role: newRole } : c
        ));
        toast.success("Collaborator role updated!");
      } else {
        toast.error("Failed to update collaborator role");
      }
    } catch (error) {
      console.error("Error updating collaborator role:", error);
      toast.error("Failed to update collaborator role");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Share "{courseName}"
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Add Collaborator Form */}
        <form onSubmit={handleAddCollaborator} className="mb-6">
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'VIEWER' | 'EDITOR')}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Viewer:</strong> Can view the course, exams, and question banks (read-only)</p>
            <p><strong>Editor:</strong> Can edit exams, question banks, and course content</p>
          </div>
        </form>

        {/* Collaborators List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Course Collaborators
          </h3>
          
          {fetchingCollaborators ? (
            <div className="text-center py-4">Loading collaborators...</div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No collaborators yet. Add someone by entering their email above.
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                      {collaborator.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {collaborator.user.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {collaborator.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={collaborator.role}
                      onChange={(e) => handleRoleChange(collaborator.id, e.target.value as 'VIEWER' | 'EDITOR')}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 