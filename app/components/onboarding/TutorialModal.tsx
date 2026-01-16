"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { PageTutorial } from "../../hooks/usePageTutorial";

interface TutorialModalProps {
  isOpen: boolean;
  tutorial: PageTutorial | null;
  pageName: string;
  onClose: () => void;
}

export default function TutorialModal({
  isOpen,
  tutorial,
  pageName,
  onClose,
}: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStepNav, setShowStepNav] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        handlePrevious();
      } else if (e.key === "ArrowRight" && !isLastStep) {
        handleNext();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (typeof window !== "undefined") {
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [isOpen, currentStep]);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSearchQuery("");
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen || !tutorial) return null;

  const currentStepData = tutorial.steps[currentStep];
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isAnimating) return;

    if (isLastStep) {
      onClose();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (isAnimating || isFirstStep) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(currentStep - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const goToStep = (stepIndex: number) => {
    if (isAnimating || stepIndex === currentStep) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(stepIndex);
      setIsAnimating(false);
      setShowStepNav(false);
    }, 150);
  };

  // Filter steps based on search
  const filteredSteps = tutorial.steps.filter(
    (step) =>
      step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="tutorial-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  {tutorial.pageTitle}
                </h2>
                <p
                  id="tutorial-description"
                  className="text-sm text-gray-600 mt-1"
                >
                  Step {currentStep + 1} of {tutorial.steps.length} • {pageName}{" "}
                  Help
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative hidden sm:block">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search steps... (⌘F)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 px-3 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Step Navigator */}
              <button
                onClick={() => setShowStepNav(!showStepNav)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Jump to step"
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Close */}
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close tutorial"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span>
                {Math.round(((currentStep + 1) / tutorial.steps.length) * 100)}%
                Complete
              </span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${
                    ((currentStep + 1) / tutorial.steps.length) * 100
                  }%`,
                }}
              />
              {/* Step markers */}
              <div className="absolute inset-0 flex items-center">
                {tutorial.steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToStep(index)}
                    className={`w-3 h-3 rounded-full border-2 border-white transition-all duration-200 ${
                      index <= currentStep ? "bg-blue-600" : "bg-gray-300"
                    } hover:scale-125`}
                    style={{
                      left: `${(index / (tutorial.steps.length - 1)) * 100}%`,
                      transform: "translateX(-50%)",
                    }}
                    title={`Go to step ${index + 1}: ${
                      tutorial.steps[index].title
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Step Navigator Dropdown */}
          {showStepNav && (
            <div className="absolute top-full left-6 right-6 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
              {(searchQuery
                ? filteredSteps.map((step) => ({
                    ...step,
                    originalIndex: tutorial.steps.findIndex(
                      (s) => s.id === step.id
                    ),
                  }))
                : tutorial.steps.map((step, index) => ({
                    ...step,
                    originalIndex: index,
                  }))
              ).map((step) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.originalIndex)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                    step.originalIndex === currentStep
                      ? "bg-blue-50 border-blue-200"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{step.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {step.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {step.description}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Step {step.originalIndex + 1}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div
            className={`p-8 pb-12 transition-all duration-300 ${
              isAnimating
                ? "opacity-0 transform translate-x-4"
                : "opacity-100 transform translate-x-0"
            }`}
          >
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 animate-bounce">
                {currentStepData.icon}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {currentStepData.title}
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {currentStepData.description}
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-8">
              {currentStepData.content}
            </div>

            {/* Quick Tip */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl max-w-2xl mx-auto">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    💡 Quick Tip
                  </h4>
                  <p className="text-sm text-blue-800">
                    Use keyboard shortcuts:{" "}
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">
                      ←
                    </kbd>{" "}
                    /{" "}
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">
                      →
                    </kbd>{" "}
                    to navigate,
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">
                      ⌘F
                    </kbd>{" "}
                    to search,
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">
                      Esc
                    </kbd>{" "}
                    to close.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep || isAnimating}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isFirstStep || isAnimating
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={isAnimating}
              className={`flex items-center space-x-2 px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isAnimating
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
              }`}
            >
              <span>{isLastStep ? "Complete Tutorial" : "Continue"}</span>
              {!isLastStep ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level to prevent hydration issues
  if (!isMounted || typeof window === "undefined" || !document?.body)
    return null;

  return createPortal(modalContent, document.body);
}
