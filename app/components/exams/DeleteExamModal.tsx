import React from "react";

interface DeleteExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  examName: string;
}

export default function DeleteExamModal({
  isOpen,
  onClose,
  onConfirm,
  examName,
}: DeleteExamModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Exam</h3>
            <p className="text-sm text-gray-600">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">"{examName}"</span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            All questions and exam data will be permanently removed from your
            account.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            Delete Exam
          </button>
        </div>
      </div>
    </div>
  );
}
