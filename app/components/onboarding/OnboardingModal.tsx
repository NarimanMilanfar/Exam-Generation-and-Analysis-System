"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: string;
  actionText?: string;
  actionUrl?: string;
}

export default function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to UExam! 🎉",
      description: "Let's get you started with creating and managing your exams",
      icon: "👋",
      content: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-brand-navy/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            UExam helps you create, manage, and analyze multiple-choice exams with ease. 
            This quick tour will show you how to get started with your first course and exam.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> You can skip this tutorial anytime and return to it later from settings.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "create-course",
      title: "Step 1: Create Your First Course",
      description: "Courses organize your exams and questions by subject",
      icon: "📚",
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-green-600 text-sm font-bold">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Click "Create Course"</h4>
              <p className="text-sm text-gray-600">Start by creating a course like "MATH 101" or "COSC 221"</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-green-600 text-sm font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Fill in Course Details</h4>
              <p className="text-sm text-gray-600">Add course name, description, and select a term</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-green-600 text-sm font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Choose a Color</h4>
              <p className="text-sm text-gray-600">Pick a color to help identify your course at a glance</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mt-4">
            <p className="text-sm text-yellow-800">
              <strong>Format tip:</strong> Use format like "COSC 101" (3-4 letters + space + 3 digits)
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "question-bank",
      title: "Step 2: Build Your Question Bank",
      description: "Create organized collections of questions by topic",
      icon: "❓",
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-purple-600 text-sm font-bold">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Create Question Banks</h4>
              <p className="text-sm text-gray-600">Group questions by topic like "Chapter 1" or "Derivatives"</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-purple-600 text-sm font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Add Questions</h4>
              <p className="text-sm text-gray-600">Write multiple-choice questions with correct answers and points</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-purple-600 text-sm font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Set Difficulty & Topics</h4>
              <p className="text-sm text-gray-600">Tag questions with difficulty levels and topics for easy filtering</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
            <p className="text-sm text-green-800">
              <strong>Pro tip:</strong> You can also upload questions in bulk using our DOCX import feature!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "create-exam",
      title: "Step 3: Create Your First Exam",
      description: "Build exams by selecting questions from your question banks",
      icon: "📝",
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-blue-600 text-sm font-bold">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Use Exam Builder</h4>
              <p className="text-sm text-gray-600">Select questions from your question banks to create an exam</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-blue-600 text-sm font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Configure Settings</h4>
              <p className="text-sm text-gray-600">Set time limits, question shuffling, and grading options</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-blue-600 text-sm font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Generate Variants</h4>
              <p className="text-sm text-gray-600">Create multiple versions to prevent cheating</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mt-4">
            <p className="text-sm text-indigo-800">
              <strong>Advanced:</strong> Use our analytics to track question performance and student progress!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Step 4: Track Performance & Analytics",
      description: "Monitor student performance and question effectiveness",
      icon: "📊",
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-orange-600 text-sm font-bold">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Upload Exam Results</h4>
              <p className="text-sm text-gray-600">Import OMR scan results or enter grades manually</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-orange-600 text-sm font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Analyze Performance</h4>
              <p className="text-sm text-gray-600">View detailed analytics on student and question performance</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
              <span className="text-orange-600 text-sm font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Improve Questions</h4>
              <p className="text-sm text-gray-600">Identify difficult questions and improve your question bank</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "complete",
      title: "You're All Set! 🚀",
      description: "Ready to start creating amazing exams",
      icon: "✅",
      content: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            You're now ready to create courses, build question banks, and generate exams. 
            If you need help later, check out the help section in settings.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900">Need Help?</h4>
              <p className="text-sm text-blue-700">Visit our help section in settings</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-medium text-green-900">Quick Start</h4>
              <p className="text-sm text-green-700">Create your first course now!</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      await onComplete();
      toast.success("Welcome to UExam! Let's get started! 🎉");
    } catch (error) {
      toast.error("Failed to complete onboarding");
      console.error("Error completing onboarding:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSkipping(true);
      await onSkip();
      toast.success("Onboarding skipped. You can access tutorials from settings anytime.");
    } catch (error) {
      toast.error("Failed to skip onboarding");
      console.error("Error skipping onboarding:", error);
    } finally {
      setIsSkipping(false);
    }
  };

  const handleAction = () => {
    if (currentStepData.actionUrl) {
      // Complete onboarding and navigate
      handleComplete().then(() => {
        router.push(currentStepData.actionUrl!);
      });
    } else {
      handleNext();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/logos/image.png"
                alt="UExam Logo"
                width={40}
                height={16}
                className="h-8 w-auto"
              />
              <div>
                <h2 className="text-xl font-bold text-brand-navy">Getting Started</h2>
                <p className="text-sm text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              disabled={isSkipping || isCompleting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div key={index} className="flex-1">
                  <div 
                    className={`h-2 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-brand-navy' : 'bg-gray-200'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{currentStepData.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          <div className="mb-8">
            {currentStepData.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep || isCompleting || isSkipping}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isFirstStep 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              ← Previous
            </button>

            <div className="flex space-x-2">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  disabled={isSkipping || isCompleting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  {isSkipping ? "Skipping..." : "Skip Tutorial"}
                </button>
              )}
              
              <button
                onClick={currentStepData.actionText ? handleAction : handleNext}
                disabled={isCompleting || isSkipping}
                className="px-6 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                {isCompleting ? (
                  "Completing..."
                ) : isLastStep ? (
                  "Get Started! 🚀"
                ) : currentStepData.actionText ? (
                  currentStepData.actionText
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 