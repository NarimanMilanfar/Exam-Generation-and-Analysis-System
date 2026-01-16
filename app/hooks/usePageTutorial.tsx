import { useState, useCallback, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: string;
  actionText?: string;
  actionUrl?: string;
}

export interface PageTutorial {
  pageTitle: string;
  description: string;
  steps: TutorialStep[];
}

interface UsePageTutorialReturn {
  currentPageTutorial: PageTutorial | null;
  showTutorial: boolean;
  startTutorial: () => void;
  closeTutorial: () => void;
  pageName: string;
  hasVisitedPage: boolean;
  markPageVisited: () => void;
  showHelpHint: boolean;
  dismissHelpHint: () => void;
}

export function usePageTutorial(): UsePageTutorialReturn {
  const pathname = usePathname();
  const [showTutorial, setShowTutorial] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Load visited pages from localStorage on mount and handle hydration
  useEffect(() => {
    setIsHydrated(true);

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tutorial-visited-pages");
      if (saved) {
        try {
          setVisitedPages(new Set(JSON.parse(saved)));
        } catch (error) {
          console.warn(
            "Failed to parse tutorial-visited-pages from localStorage:",
            error
          );
        }
      }

      const savedHints = localStorage.getItem("tutorial-dismissed-hints");
      if (savedHints) {
        try {
          setDismissedHints(new Set(JSON.parse(savedHints)));
        } catch (error) {
          console.warn(
            "Failed to parse tutorial-dismissed-hints from localStorage:",
            error
          );
        }
      }
    }
  }, []);

  // Define tutorials for different pages
  const pageTutorials: Record<string, PageTutorial> = useMemo(
    () => ({
      "/dashboard": {
        pageTitle: "Dashboard Tutorial",
        description: "Learn how to navigate your main dashboard",
        steps: [
          {
            id: "dashboard-overview",
            title: "Welcome to Your Dashboard! 📊",
            description: "Your control center for managing courses and exams",
            icon: "🏠",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Your dashboard shows an overview of all your courses, exams,
                  and questions. Here you can quickly see your progress and
                  access all major features.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Quick Stats
                  </h4>
                  <p className="text-sm text-blue-800">
                    The top cards show your total courses, exams, and questions
                    at a glance.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "create-course-dashboard",
            title: "Creating Your First Course 📚",
            description: "Start building your course collection",
            icon: "➕",
            actionText: "Create Course",
            content: (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-green-600 text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Click "Create Course"
                    </h4>
                    <p className="text-sm text-gray-600">
                      Use the blue button or the + card
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-green-600 text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Fill Course Details
                    </h4>
                    <p className="text-sm text-gray-600">
                      Add name, description, and choose a color
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
      "/course-selector": {
        pageTitle: "Course Selector Tutorial",
        description: "Learn how to select courses for different features",
        steps: [
          {
            id: "course-selection",
            title: "Course Selection Guide 🎯",
            description: "Choose a course to access its features",
            icon: "🎯",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  This page helps you select which course you want to work with.
                  Choose a course to access question banks, exam builder, or
                  analytics.
                </p>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">
                    Course Features
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Question Bank: Manage your questions</li>
                    <li>• Exam Builder: Create and configure exams</li>
                    <li>• Analytics: View performance data</li>
                  </ul>
                </div>
              </div>
            ),
          },
        ],
      },
      "/question-bank": {
        pageTitle: "Question Bank Tutorial",
        description: "Master question management and organization",
        steps: [
          {
            id: "question-bank-overview",
            title: "Welcome to Question Bank Management! 📚",
            description:
              "Your complete guide to organizing and managing questions",
            icon: "📚",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Question banks are powerful organizational tools that help you
                  create, manage, and categorize questions for effective exam
                  building. Think of them as folders that group related
                  questions together.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Organize by Topic
                    </h4>
                    <p className="text-sm text-green-700">
                      Group questions by chapter, subject, or theme
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Multiple Input Methods
                    </h4>
                    <p className="text-sm text-blue-700">
                      Manual entry or bulk import via DOCX
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Advanced Filtering
                    </h4>
                    <p className="text-sm text-purple-700">
                      Search and filter by difficulty, topic, type
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-medium text-orange-900">
                      Export & Share
                    </h4>
                    <p className="text-sm text-orange-700">
                      Export questions in various formats
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    Best Practices
                  </h4>
                  <ul className="text-sm text-indigo-800 space-y-1">
                    <li>
                      • Create separate banks for each chapter or major topic
                    </li>
                    <li>
                      • Use descriptive names and color coding for easy
                      identification
                    </li>
                    <li>
                      • Maintain consistent difficulty standards across banks
                    </li>
                    <li>• Regularly review and update question content</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "creating-question-banks",
            title: "Creating and Organizing Question Banks 🗂️",
            description: "Set up your question bank structure effectively",
            icon: "🗂️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Start by creating well-organized question banks that reflect
                  your course structure. This foundation will make exam building
                  much more efficient.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Click "Create Question Bank"
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use the blue button to start creating a new bank
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Choose Descriptive Names
                      </h4>
                      <p className="text-sm text-gray-600">
                        Examples: "Chapter 1: Variables", "Midterm Topics",
                        "Advanced Concepts"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Add Descriptions & Topics
                      </h4>
                      <p className="text-sm text-gray-600">
                        Include helpful descriptions and topic tags for better
                        organization
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        4
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Color Code for Organization
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use different colors to visually distinguish between
                        topics
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Pro Tip:</strong> Create banks that align with
                    your syllabus structure - this makes finding questions much
                    easier when building exams.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "adding-questions-manually",
            title: "Adding Questions Manually ✏️",
            description: "Create high-quality questions with detailed settings",
            icon: "✏️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Learn to create well-structured questions with all the
                  necessary details for effective assessment.
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Question Content
                    </h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>• Write clear, unambiguous question text</p>
                      <p>• Provide 2-6 answer options for multiple choice</p>
                      <p>• Mark the correct answer clearly</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-green-900 mb-2">
                      Difficulty & Scoring
                    </h4>
                    <div className="space-y-2 text-sm text-green-800">
                      <p>• Set difficulty: Easy, Medium, or Hard</p>
                      <p>• Assign point values (typically 1-5 points)</p>
                      <p>
                        • Configure negative points for wrong answers (optional)
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-medium text-purple-900 mb-2">
                      Question Types
                    </h4>
                    <div className="space-y-2 text-sm text-purple-800">
                      <p>
                        • Multiple Choice: 2-6 options with one correct answer
                      </p>
                      <p>• True/False: Simple binary choice questions</p>
                      <p>• Topic tags help with organization and filtering</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    ✍️ Writing Tips
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>
                      • Avoid "all of the above" or "none of the above" options
                    </li>
                    <li>• Make distractors plausible but clearly incorrect</li>
                    <li>• Keep answer options roughly the same length</li>
                    <li>• Test one concept per question</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "bulk-import-docx",
            title: "Bulk Import with DOCX Files 📄",
            description: "Efficiently import large sets of questions",
            icon: "📄",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Save time by importing questions in bulk using properly
                  formatted DOCX files. Perfect for migrating existing question
                  sets or working with large question libraries.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Open Question Bank
                      </h4>
                      <p className="text-sm text-gray-600">
                        Navigate to the specific question bank where you want to
                        add questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Click "Upload DOCX"
                      </h4>
                      <p className="text-sm text-gray-600">
                        Find the upload button and select your prepared DOCX
                        file
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Review & Edit
                      </h4>
                      <p className="text-sm text-gray-600">
                        Preview imported questions and make any necessary
                        adjustments
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        4
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Save to Database
                      </h4>
                      <p className="text-sm text-gray-600">
                        Confirm the import to add all questions to your question
                        bank
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    📋 DOCX Format Requirements
                  </h4>
                  <p className="text-sm text-yellow-800">
                    Check the question format guide in your course templates for
                    proper DOCX structure. The system expects specific
                    formatting for questions, options, and correct answers.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>⚡ Time Saver:</strong> DOCX upload can process
                    dozens of questions in seconds, perfect for large question
                    sets!
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "filtering-searching",
            title: "Advanced Filtering & Search 🔍",
            description: "Find exactly the questions you need quickly",
            icon: "🔍",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Master the powerful filtering and search tools to efficiently
                  locate and manage questions across your question banks.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Text Search</h4>
                    <p className="text-sm text-blue-700">
                      Search question content, topics, and options
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Difficulty Filter
                    </h4>
                    <p className="text-sm text-green-700">
                      Show only Easy, Medium, or Hard questions
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Question Bank Filter
                    </h4>
                    <p className="text-sm text-purple-700">
                      View questions from specific banks only
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-medium text-orange-900">
                      Topic Filter
                    </h4>
                    <p className="text-sm text-orange-700">
                      Filter by topic tags and categories
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-500">
                    <h4 className="font-medium text-gray-900 mb-2">
                      🎯 Search Tips
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Use keywords from question text or topics</li>
                      <li>
                        • Combine search with difficulty filters for precision
                      </li>
                      <li>
                        • Search is case-insensitive and matches partial words
                      </li>
                      <li>• Clear filters to see all questions again</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    🔄 Workflow Examples
                  </h4>
                  <div className="space-y-2 text-sm text-indigo-800">
                    <p>
                      <strong>Building an Easy Quiz:</strong> Filter by "Easy"
                      difficulty across all banks
                    </p>
                    <p>
                      <strong>Topic-Specific Exam:</strong> Search "variables" +
                      filter by specific question bank
                    </p>
                    <p>
                      <strong>Review Hard Questions:</strong> Filter "Hard" to
                      identify challenging content
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "question-management",
            title: "Managing & Editing Questions 📝",
            description: "Keep your question content current and accurate",
            icon: "📝",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Learn to effectively manage your question collection with
                  editing, organization, and maintenance tools.
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-blue-900 mb-2">
                      ✏️ Editing Questions
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>• Click any question to open the edit modal</p>
                      <p>
                        • Modify text, options, correct answers, and settings
                      </p>
                      <p>• Update difficulty levels as content evolves</p>
                      <p>• Add or modify topic tags for better organization</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-green-900 mb-2">
                      🗑️ Removing Questions
                    </h4>
                    <div className="space-y-1 text-sm text-green-800">
                      <p>• Delete outdated or incorrect questions</p>
                      <p>• Confirmation prompts prevent accidental deletion</p>
                      <p>• Consider moving instead of deleting when possible</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-medium text-purple-900 mb-2">
                      📊 Question Analytics
                    </h4>
                    <div className="space-y-1 text-sm text-purple-800">
                      <p>
                        • View question bank statistics (total questions,
                        points)
                      </p>
                      <p>• Monitor question distribution by difficulty</p>
                      <p>• Track creation dates for content freshness</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    🔄 Maintenance Best Practices
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>
                      • Regularly review questions for accuracy and relevance
                    </li>
                    <li>• Update questions based on student feedback</li>
                    <li>• Maintain balance across difficulty levels</li>
                    <li>• Archive outdated content rather than deleting</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "export-sharing",
            title: "Export & Sharing Features 📤",
            description: "Share questions and create backups efficiently",
            icon: "📤",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Learn to export questions in various formats for sharing,
                  backup, or use in other systems.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Select Export Options
                      </h4>
                      <p className="text-sm text-gray-600">
                        Choose specific question banks or individual questions
                        to export
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Choose Format
                      </h4>
                      <p className="text-sm text-gray-600">
                        Export with or without answer keys depending on your
                        needs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Filter Before Export
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use search and filters to export only specific subsets
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      With Answer Keys
                    </h4>
                    <p className="text-sm text-green-700">
                      Complete export for instructors and grading
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Without Answers
                    </h4>
                    <p className="text-sm text-blue-700">
                      Student-friendly format for practice
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">
                    📋 Export Use Cases
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Backup your question collection</li>
                    <li>• Share questions with colleagues</li>
                    <li>• Create practice materials for students</li>
                    <li>• Import into other assessment systems</li>
                    <li>• Archive questions for future courses</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "question-bank-mastery",
            title: "Question Bank Mastery Complete! 🎓",
            description:
              "You're ready to create comprehensive question collections",
            icon: "🎓",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Congratulations! You now have complete mastery of the question
                  bank system. You can efficiently create, organize, and manage
                  professional question collections.
                </p>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-green-900 mb-2">
                      ✅ What You've Learned
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>
                        • Creating and organizing question banks effectively
                      </li>
                      <li>• Manual question creation with proper formatting</li>
                      <li>• Bulk import using DOCX files for efficiency</li>
                      <li>• Advanced filtering and search techniques</li>
                      <li>• Question management and editing workflows</li>
                      <li>• Export features for sharing and backup</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Next Steps</h4>
                    <p className="text-sm text-blue-700">
                      Use your question banks to build comprehensive exams
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Keep Learning
                    </h4>
                    <p className="text-sm text-purple-700">
                      Explore Exam Builder and Analytics tutorials
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    🚀 Pro Tips for Success
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Start with a clear organizational structure</li>
                    <li>• Maintain consistent quality standards</li>
                    <li>• Regular review and updates keep content fresh</li>
                    <li>• Use collaboration features for team development</li>
                    <li>• Leverage export features for backup and sharing</li>
                  </ul>
                </div>
              </div>
            ),
          },
        ],
      },
      "/exams": {
        pageTitle: "Exam Builder Tutorial",
        description: "Master the comprehensive exam creation process",
        steps: [
          {
            id: "exam-builder-overview",
            title: "Welcome to Exam Builder! 🔧",
            description: "Your central hub for creating comprehensive exams",
            icon: "🔧",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The Exam Builder is where you create professional,
                  customizable exams by selecting questions from your question
                  banks and configuring advanced settings.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Smart Selection
                    </h4>
                    <p className="text-sm text-blue-700">
                      Choose from your question banks
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Easy Organization
                    </h4>
                    <p className="text-sm text-green-700">
                      Drag and reorder questions
                    </p>
                  </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    Key Features
                  </h4>
                  <ul className="text-sm text-indigo-800 space-y-1">
                    <li>• Select questions from multiple question banks</li>
                    <li>
                      • Configure exam metadata (terms, sections, time limits)
                    </li>
                    <li>• Generate multiple variants for academic integrity</li>
                    <li>• Advanced question filtering and organization</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "exam-information",
            title: "Setting Up Exam Information 📝",
            description: "Configure the basic details of your exam",
            icon: "📝",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Start by filling in your exam's basic information. This
                  metadata helps organize and identify your exam.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Exam Name</h4>
                      <p className="text-sm text-gray-600">
                        Give your exam a clear, descriptive name (e.g., "Midterm
                        Exam", "Chapter 5 Quiz")
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Term & Section
                      </h4>
                      <p className="text-sm text-gray-600">
                        Select the academic term and section for this exam
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Description (Optional)
                      </h4>
                      <p className="text-sm text-gray-600">
                        Add instructions or context for students
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Tip:</strong> Use consistent naming conventions
                    like "Course - Topic - Type" (e.g., "COSC 101 - Variables -
                    Quiz")
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "question-bank-selection",
            title: "Selecting Question Banks 📚",
            description: "Choose which question banks to draw from",
            icon: "📚",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Question banks organize your questions by topic. Select
                  multiple banks to create comprehensive exams covering
                  different topics.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Select Question Banks
                      </h4>
                      <p className="text-sm text-gray-600">
                        Choose "ALL" to see all questions, or select specific
                        banks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Review Available Questions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Questions from selected banks appear in the "Available
                        Questions" panel
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Mix and Match
                      </h4>
                      <p className="text-sm text-gray-600">
                        Combine questions from different topics for
                        comprehensive coverage
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Strategy:</strong> For balanced exams, select 2-3
                    related question banks covering the exam scope.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "question-selection",
            title: "Adding Questions to Your Exam ➕",
            description: "Browse, filter, and select questions for your exam",
            icon: "➕",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Browse through available questions and select the ones that
                  best fit your exam. Use filters to find questions by
                  difficulty, topic, or type.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Filter Questions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use search, difficulty, and type filters to find
                        specific questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Click to Add
                      </h4>
                      <p className="text-sm text-gray-600">
                        Click the "+" button on any question to add it to your
                        exam
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Review Selected
                      </h4>
                      <p className="text-sm text-gray-600">
                        Added questions appear in the "Exam Questions" panel on
                        the right
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="text-xs font-medium text-green-900">
                      EASY
                    </div>
                    <div className="text-xs text-green-700">Quick recall</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded text-center">
                    <div className="text-xs font-medium text-yellow-900">
                      MEDIUM
                    </div>
                    <div className="text-xs text-yellow-700">Application</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded text-center">
                    <div className="text-xs font-medium text-red-900">HARD</div>
                    <div className="text-xs text-red-700">Analysis</div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "question-organization",
            title: "Organizing Your Questions 🎯",
            description: "Reorder and fine-tune your exam structure",
            icon: "🎯",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Once you've added questions, you can reorder them to create
                  the perfect exam flow. Consider organizing by difficulty or
                  topic.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Reorder Questions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use ↑ and ↓ buttons to move questions up or down
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Remove Questions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Click the "×" button to remove questions you don't want
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Check Point Values
                      </h4>
                      <p className="text-sm text-gray-600">
                        Review points for each question and total exam score
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    💡 Organization Tips
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Start with easier questions to build confidence</li>
                    <li>• Group questions by topic for logical flow</li>
                    <li>
                      • End with challenging questions for differentiation
                    </li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "exam-settings",
            title: "Advanced Exam Configuration ⚙️",
            description: "Configure timing, variants, and advanced options",
            icon: "⚙️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Once your exam is saved, you can access advanced settings like
                  time limits, question shuffling, and multiple variants for
                  academic integrity.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Time Limits</h4>
                    <p className="text-sm text-yellow-700">
                      Set appropriate time for completion
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-900">
                      Question Shuffling
                    </h4>
                    <p className="text-sm text-red-700">
                      Randomize question order
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Answer Shuffling
                    </h4>
                    <p className="text-sm text-purple-700">
                      Randomize answer choices
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <h4 className="font-medium text-indigo-900">
                      Multiple Variants
                    </h4>
                    <p className="text-sm text-indigo-700">
                      Generate different versions
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    🎯 Next Steps
                  </h4>
                  <p className="text-sm text-gray-700">
                    After creating your exam, visit the main exams page to
                    configure advanced settings, generate variants, and view
                    analytics.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "exam-export-sharing",
            title: "Exporting and Sharing Exams 📤",
            description: "Share your exams with colleagues or backup your work",
            icon: "📤",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Once you've created your exams, you can easily export them to
                  DOCX format for sharing with colleagues, backup purposes, or
                  external use.
                </p>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    🔍 Finding the Export Button
                  </h4>
                  <p className="text-sm text-blue-800">
                    The "Export DOCX" button is located at the top of the exams
                    page, next to the "Create New Exam" button. It only appears
                    when you have exams to export.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Select Exams to Export
                      </h4>
                      <p className="text-sm text-gray-600">
                        Check the boxes next to the exams you want to export, or
                        select all
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Click Export DOCX
                      </h4>
                      <p className="text-sm text-gray-600">
                        The export button will show how many exams are selected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Download & Share
                      </h4>
                      <p className="text-sm text-gray-600">
                        Your DOCX file will download automatically with all
                        selected exams
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    📋 Export Features
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Export single or multiple exams at once</li>
                    <li>
                      • Complete exam formatting with questions and answers
                    </li>
                    <li>• Perfect for sharing with colleagues or backup</li>
                    <li>• Professional DOCX format ready for printing</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "saving-exam",
            title: "Saving and Publishing 💾",
            description: "Finalize your exam and make it available",
            icon: "💾",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Ready to finalize your exam? Save your work and access
                  additional features from the main exams page.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Save Your Exam
                      </h4>
                      <p className="text-sm text-gray-600">
                        Click "Create Exam" or "Save Changes" to save your work
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Access Advanced Features
                      </h4>
                      <p className="text-sm text-gray-600">
                        Generate variants, set time limits, and configure
                        settings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Review and Publish
                      </h4>
                      <p className="text-sm text-gray-600">
                        Test your exam and publish when ready
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    🎉 Congratulations!
                  </h4>
                  <p className="text-sm text-green-800">
                    You've mastered the Exam Builder! You can now create
                    professional, well-organized exams that effectively assess
                    your students' knowledge.
                  </p>
                </div>
              </div>
            ),
          },
        ],
      },
      "/analytics": {
        pageTitle: "Analytics Tutorial",
        description: "Understand performance data and insights",
        steps: [
          {
            id: "analytics-overview",
            title: "Analytics Dashboard 📈",
            description: "Track student performance and question effectiveness",
            icon: "📈",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Analytics help you understand how students perform and which
                  questions are most effective for assessment.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Student Performance
                    </h4>
                    <p className="text-sm text-blue-700">
                      Track individual progress
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Question Analysis
                    </h4>
                    <p className="text-sm text-green-700">
                      Identify difficult questions
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-orange-900 mb-2">
                    Key Metrics
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Student performance trends over time</li>
                    <li>• Question difficulty analysis and statistics</li>
                    <li>• Exam completion rates and timing data</li>
                    <li>• Comparative performance across sections</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "uploading-results",
            title: "Uploading Exam Results 📤",
            description: "Import OMR scan results or manual grades",
            icon: "📤",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  To see analytics, you first need to upload exam results. UExam
                  supports both OMR scanned results and manual entry.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Prepare Results File
                      </h4>
                      <p className="text-sm text-gray-600">
                        Format your OMR results or create a CSV with student
                        answers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Upload via Analytics
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use the result uploader tool in the analytics section
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Review and Confirm
                      </h4>
                      <p className="text-sm text-gray-600">
                        Verify the uploaded data before generating analytics
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Check the templates section for
                    proper file formatting guidelines.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "understanding-metrics",
            title: "Understanding Key Metrics 🎯",
            description: "Interpret the analytics data effectively",
            icon: "🎯",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Learn to read and interpret the various analytics metrics to
                  make informed decisions about your teaching and assessment.
                </p>
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Question Difficulty
                    </h4>
                    <p className="text-sm text-green-700">
                      Percentage of students who answered correctly
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900">
                      Discrimination Index
                    </h4>
                    <p className="text-sm text-yellow-700">
                      How well questions differentiate between high and low
                      performers
                    </p>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Class Average</h4>
                    <p className="text-sm text-blue-700">
                      Overall performance across all students
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Time Analysis
                    </h4>
                    <p className="text-sm text-purple-700">
                      How long students spend on different questions
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
      "/activity": {
        pageTitle: "Activity Page Tutorial",
        description: "Track collaboration and course changes",
        steps: [
          {
            id: "activity-overview",
            title: "Welcome to Activity Tracking! 📋",
            description: "Monitor all course actions and collaboration",
            icon: "📋",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The Activity page provides a comprehensive audit trail of all
                  actions performed on your course. Perfect for collaboration
                  accountability and tracking course evolution over time.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Activity Timeline
                    </h4>
                    <p className="text-sm text-blue-700">
                      Chronological view of all changes
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Collaboration Insight
                    </h4>
                    <p className="text-sm text-green-700">
                      See who did what and when
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    Key Benefits
                  </h4>
                  <ul className="text-sm text-indigo-800 space-y-1">
                    <li>• Track all content creation and modifications</li>
                    <li>• Monitor collaborator contributions and activity</li>
                    <li>• Maintain audit trail for academic integrity</li>
                    <li>• Identify active periods and user engagement</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "activity-stats",
            title: "Understanding Activity Statistics 📊",
            description:
              "Get insights into course engagement and activity levels",
            icon: "📊",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The statistics cards at the top provide a quick overview of
                  course activity levels and help you understand engagement
                  patterns.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">
                        📝
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Total Activities
                      </h4>
                      <p className="text-sm text-gray-600">
                        Cumulative count of all recorded actions since course
                        creation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        📈
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Recent (7 days)
                      </h4>
                      <p className="text-sm text-gray-600">
                        Activities from the past week - shows current engagement
                        level
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        👥
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Active Users
                      </h4>
                      <p className="text-sm text-gray-600">
                        Number of unique users who have made contributions
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Insight:</strong> High recent activity indicates
                    active collaboration, while total activities show overall
                    course maturity.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "activity-log",
            title: "Reading the Activity Log 📚",
            description: "Understand what each activity entry tells you",
            icon: "📚",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Each activity entry in the log shows detailed information
                  about actions performed on your course. Here's how to
                  interpret the information displayed.
                </p>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          JD
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            John Doe
                          </span>
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Created Exam
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          exam "Midterm Exam"
                        </p>
                        <p className="text-xs text-gray-400">
                          Today at 2:30 PM
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">User Avatar</h4>
                    <p className="text-sm text-blue-700">
                      Shows initials of person who performed the action
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">Action Badge</h4>
                    <p className="text-sm text-green-700">
                      Color-coded by action type (create, update, delete)
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Resource Details
                    </h4>
                    <p className="text-sm text-purple-700">
                      Shows what was modified and its name
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-medium text-orange-900">Timestamp</h4>
                    <p className="text-sm text-orange-700">
                      Exact date and time of the action
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "activity-types",
            title: "Activity Types & Color Coding 🎨",
            description:
              "Understand different types of actions and their meanings",
            icon: "🎨",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Activities are color-coded to help you quickly identify the
                  type of action performed. Each color represents a different
                  category of change to your course.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">
                        +
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Created Actions
                      </h4>
                      <p className="text-sm text-gray-600">
                        New content added - exams, questions, question banks
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Created Exam
                        </span>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Created Question
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">✎</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Updated Actions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Modifications to existing content
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Updated Exam
                        </span>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Updated Question
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">×</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Deleted Actions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Content removal from the course
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Deleted Exam
                        </span>
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Deleted Question
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">
                        👥
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Collaboration Actions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Sharing and collaborator management
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                          Added Collaborator
                        </span>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                          Shared Course
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "collaboration-benefits",
            title: "Collaboration & Accountability 🤝",
            description: "How activity tracking improves teamwork",
            icon: "🤝",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Activity tracking is especially valuable when working with
                  collaborators. It provides transparency, accountability, and
                  helps coordinate team efforts effectively.
                </p>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-green-900 mb-2">
                      👥 Team Transparency
                    </h4>
                    <p className="text-sm text-green-800">
                      See exactly who contributed what to the course, fostering
                      accountability and recognition.
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-blue-900 mb-2">
                      📊 Work Distribution
                    </h4>
                    <p className="text-sm text-blue-800">
                      Monitor workload distribution and identify who's most
                      active in course development.
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-medium text-purple-900 mb-2">
                      🔍 Change Tracking
                    </h4>
                    <p className="text-sm text-purple-800">
                      Track when important changes were made, helping with
                      version control and rollback decisions.
                    </p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-medium text-orange-900 mb-2">
                      📋 Audit Trail
                    </h4>
                    <p className="text-sm text-orange-800">
                      Maintain detailed records for compliance, academic
                      integrity, and institutional requirements.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "activity-best-practices",
            title: "Making the Most of Activity Tracking 🎯",
            description:
              "Tips for effective course management and collaboration",
            icon: "🎯",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Here are some best practices for using the activity page to
                  improve your course management and collaboration workflows.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Regular Check-ins
                      </h4>
                      <p className="text-sm text-gray-600">
                        Review recent activity weekly to stay informed about
                        course changes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Collaboration Monitoring
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use activity stats to ensure all collaborators are
                        engaged
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Change Documentation
                      </h4>
                      <p className="text-sm text-gray-600">
                        Reference activity log when documenting course evolution
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        4
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Quality Assurance
                      </h4>
                      <p className="text-sm text-gray-600">
                        Track when content was last updated to maintain
                        freshness
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    🎉 Activity Mastery Complete!
                  </h4>
                  <p className="text-sm text-green-800">
                    You now understand how to use activity tracking for better
                    course management and collaboration. The activity page will
                    become an invaluable tool for maintaining course quality and
                    accountability.
                  </p>
                </div>
              </div>
            ),
          },
        ],
      },
      "/settings": {
        pageTitle: "Settings Tutorial",
        description: "Customize your UExam experience",
        steps: [
          {
            id: "settings-overview",
            title: "Settings & Preferences ⚙️",
            description: "Customize your account and application preferences",
            icon: "⚙️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The settings page allows you to customize your profile,
                  security settings, and application preferences.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Profile Settings
                    </h4>
                    <p className="text-sm text-blue-700">
                      Update personal information
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Security Options
                    </h4>
                    <p className="text-sm text-green-700">
                      Password and 2FA settings
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Available Settings
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Profile information and avatar management</li>
                    <li>• Password change and security settings</li>
                    <li>• Two-factor authentication setup</li>
                    <li>• Notification preferences</li>
                    <li>• Tutorial and help preferences</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "profile-management",
            title: "Managing Your Profile 👤",
            description: "Update your personal information and avatar",
            icon: "👤",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Keep your profile information up to date for a personalized
                  experience and proper identification in course collaborations.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Update Personal Info
                      </h4>
                      <p className="text-sm text-gray-600">
                        Change your display name and contact information
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Upload Avatar
                      </h4>
                      <p className="text-sm text-gray-600">
                        Add a profile picture that appears in the sidebar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Email Verification
                      </h4>
                      <p className="text-sm text-gray-600">
                        Verify your email address for security
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "security-settings",
            title: "Security & Two-Factor Auth 🔒",
            description: "Enhance your account security",
            icon: "🔒",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Protect your UExam account with strong security measures
                  including password updates and two-factor authentication.
                </p>
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-900">
                      Password Security
                    </h4>
                    <p className="text-sm text-red-700">
                      Use a strong, unique password for your account
                    </p>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-medium text-orange-900">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-sm text-orange-700">
                      Add an extra layer of security with 2FA
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900">
                      Account Recovery
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Set up recovery options in case you forget your password
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    🛡️ Security Best Practices
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Enable two-factor authentication</li>
                    <li>• Use a unique password for UExam</li>
                    <li>• Keep your email address up to date</li>
                    <li>• Log out when using shared computers</li>
                  </ul>
                </div>
              </div>
            ),
          },
        ],
      },
      "/course-page": {
        pageTitle: "Course Page Tutorial",
        description: "Master your course dashboard and navigation",
        steps: [
          {
            id: "course-overview",
            title: "Welcome to Your Course Dashboard! 🎓",
            description: "Your central hub for managing this course",
            icon: "🎓",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The course dashboard is your command center for managing all
                  aspects of this specific course. From here, you can access
                  question banks, create exams, view analytics, and manage
                  students.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Quick Stats</h4>
                    <p className="text-sm text-blue-700">
                      Overview of exams, questions, and students
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Fast Navigation
                    </h4>
                    <p className="text-sm text-green-700">
                      Direct links to all major features
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">
                    Key Features
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Quick access to question banks and exam creation</li>
                    <li>• Course statistics and performance overview</li>
                    <li>• Student management and enrollment tools</li>
                    <li>• Export and backup functionality</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "course-stats",
            title: "Understanding Course Statistics 📊",
            description: "Track your course progress and engagement",
            icon: "📊",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The statistics cards at the top give you an instant overview
                  of your course's current state and help you identify areas
                  that need attention.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">
                        📝
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Total Exams</h4>
                      <p className="text-sm text-gray-600">
                        Number of exams created for this course
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        ❓
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Total Questions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Number of questions available across all question banks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        👥
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Students</h4>
                      <p className="text-sm text-gray-600">
                        Number of enrolled students
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Tip:</strong> These stats update automatically as
                    you add content and students to your course.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "main-navigation",
            title: "Course Feature Navigation 🧭",
            description: "Access all major course features quickly",
            icon: "🧭",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The main navigation cards provide direct access to all the
                  core features you'll use to build and manage your course
                  content. You can also fast access to anything from the
                  sidebar.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    🧭 Navigation Options
                  </h4>
                  <div className="space-y-2 text-sm text-yellow-800">
                    <p>
                      <strong>Course Dashboard Cards:</strong> Direct access to
                      course-specific features from this page
                    </p>
                    <p>
                      <strong>Sidebar Navigation:</strong> Global access to all
                      features across different courses
                    </p>
                    <p className="text-xs text-yellow-700 italic">
                      Both lead to the same features - use whichever feels more
                      convenient!
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Question Banks
                      </h4>
                      <p className="text-sm text-gray-600">
                        Create and organize questions by topic or chapter
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Exam Builder
                      </h4>
                      <p className="text-sm text-gray-600">
                        Create exams by selecting questions from your banks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Analytics</h4>
                      <p className="text-sm text-gray-600">
                        View student performance and question statistics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        4
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Activity Log
                      </h4>
                      <p className="text-sm text-gray-600">
                        Track changes and collaboration activity
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    🎯 Quick Start Workflow
                  </h4>
                  <ol className="text-sm text-indigo-800 space-y-1">
                    <li>1. Create question banks and add questions</li>
                    <li>2. Build exams using your question banks</li>
                    <li>3. Generate variants and configure settings</li>
                    <li>4. Upload results and view analytics</li>
                  </ol>
                </div>
              </div>
            ),
          },
          {
            id: "student-management",
            title: "Student Management Tools 👥",
            description: "Manage course enrollment and student data",
            icon: "👥",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  The right sidebar provides tools for managing students in your
                  course, including enrollment, data export, and roster
                  management.
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Student Enrollment
                    </h4>
                    <p className="text-sm text-blue-700">
                      Add individual students or upload CSV rosters
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Export Archive
                    </h4>
                    <p className="text-sm text-green-700">
                      Download complete course data for backup
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">
                      Roster Management
                    </h4>
                    <p className="text-sm text-purple-700">
                      View and edit enrolled student information
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    📋 Student Data Features
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• CSV import for bulk student enrollment</li>
                    <li>• Individual student profile management</li>
                    <li>• Complete course archive export</li>
                    <li>• Student performance tracking</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "course-settings",
            title: "Course Settings & Configuration ⚙️",
            description: "Customize your course preferences and metadata",
            icon: "⚙️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Access advanced course settings to customize how your course
                  appears and behaves, including collaboration, sharing, and
                  display preferences.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        🎨
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Course Appearance
                      </h4>
                      <p className="text-sm text-gray-600">
                        Change course name, description, and color coding
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-red-600 text-sm font-bold">🤝</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Collaboration
                      </h4>
                      <p className="text-sm text-gray-600">
                        Add collaborators and manage permissions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-yellow-600 text-sm font-bold">
                        🔧
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Advanced Settings
                      </h4>
                      <p className="text-sm text-gray-600">
                        Configure terms, sections, and other metadata
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Pro Tip:</strong> Use the "Manage Settings"
                    button at the bottom of the main panel to access all
                    configuration options.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "getting-started",
            title: "Ready to Build Your Course! 🚀",
            description: "Your next steps to create effective assessments",
            icon: "🚀",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  You now have a complete overview of your course dashboard!
                  Here's a suggested workflow to get you started with creating
                  effective assessments.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Start with Question Banks
                      </h4>
                      <p className="text-sm text-gray-600">
                        Organize questions by topic or chapter for easy exam
                        building
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Create Your First Exam
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use the Exam Builder to select and organize questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Add Students
                      </h4>
                      <p className="text-sm text-gray-600">
                        Upload student rosters and manage enrollment
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-orange-600 text-sm font-bold">
                        4
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Analyze Results
                      </h4>
                      <p className="text-sm text-gray-600">
                        Upload exam results and review analytics
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    🎉 You're All Set!
                  </h4>
                  <p className="text-sm text-green-800">
                    Your course dashboard is ready to use! Remember, you can
                    always access this tutorial by clicking the help button in
                    the sidebar. Each section has its own detailed tutorial too.
                  </p>
                </div>
              </div>
            ),
          },
        ],
      },
      "/templates": {
        pageTitle: "Templates Tutorial",
        description:
          "Create reusable exam templates for consistent assessments",
        steps: [
          {
            id: "templates-overview",
            title: "Welcome to Exam Templates! 📝",
            description: "Create standardized exam structures for future use",
            icon: "📝",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Templates allow you to create reusable exam structures that
                  maintain consistency across different terms and exam
                  instances. Define sections, question types, and selection
                  rules once, then apply them to multiple exams.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      Reusable Structure
                    </h4>
                    <p className="text-sm text-blue-700">
                      Save time with predefined layouts
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">
                      Consistent Exams
                    </h4>
                    <p className="text-sm text-green-700">
                      Maintain uniform exam standards
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">
                    Template Benefits
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Save time creating similar exams</li>
                    <li>• Ensure consistent exam structure across terms</li>
                    <li>• Standardize question distribution and formatting</li>
                    <li>• Share templates with collaborators</li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: "creating-templates",
            title: "Creating Your First Template 🏗️",
            description:
              "Build a template with sections and question parameters",
            icon: "🏗️",
            actionText: "Create Template",
            content: (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Template Details
                    </h4>
                    <p className="text-sm text-gray-600">
                      Give your template a descriptive name and description.
                      Choose a color for easy identification.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-green-600 text-sm font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Define Sections
                    </h4>
                    <p className="text-sm text-gray-600">
                      Create sections like "Multiple Choice", "Short Answer",
                      etc. Set question ranges for each section.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-purple-600 text-sm font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Question Selection
                    </h4>
                    <p className="text-sm text-gray-600">
                      Set rules for how questions are selected from your
                      question banks - by difficulty, topic, or manual
                      selection.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "template-sections",
            title: "Organizing Template Sections 📚",
            description: "Structure your exam with logical sections",
            icon: "📚",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Sections help organize your exam into logical groups. Each
                  section can have different question types and selection
                  criteria.
                </p>
                <div className="space-y-3">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">
                      Section Properties
                    </h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>
                        • <strong>Name:</strong> Descriptive title (e.g.,
                        "Multiple Choice", "Essay Questions")
                      </li>
                      <li>
                        • <strong>Question Type:</strong> MC, Short Answer,
                        Essay, True/False, etc.
                      </li>
                      <li>
                        • <strong>Question Range:</strong> Start and end
                        question numbers
                      </li>
                      <li>
                        • <strong>Selection Rules:</strong> How questions are
                        chosen from banks
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Best Practices
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Group similar question types together</li>
                      <li>• Use clear, descriptive section names</li>
                      <li>• Plan question numbering in advance</li>
                      <li>• Consider exam flow and difficulty progression</li>
                    </ul>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "using-templates",
            title: "Using Templates to Create Exams ⚡",
            description: "Apply templates to generate new exams quickly",
            icon: "⚡",
            actionText: "Use Template",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Once created, templates can be used to generate new exams
                  instantly. The template structure is applied, and questions
                  are selected according to your rules.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-green-600 text-sm font-bold">
                        1
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Select Template
                      </h4>
                      <p className="text-sm text-gray-600">
                        Choose from your saved templates on the templates page
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Create Exam</h4>
                      <p className="text-sm text-gray-600">
                        Click "Create Exam Using Template" to generate a new
                        exam with the template structure
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-purple-600 text-sm font-bold">
                        3
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Customize</h4>
                      <p className="text-sm text-gray-600">
                        Fine-tune the generated exam as needed before finalizing
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h4 className="font-medium text-emerald-900 mb-2">Pro Tip</h4>
                  <p className="text-sm text-emerald-800">
                    Templates work best when you have well-organized question
                    banks with proper tagging and difficulty levels assigned.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "template-management",
            title: "Managing Your Templates 🗂️",
            description: "Edit, view, and organize your template library",
            icon: "🗂️",
            content: (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Keep your templates organized and up-to-date. Regular
                  maintenance ensures they remain useful as your courses evolve.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Template Actions
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        • <strong>View:</strong> See template structure and
                        details
                      </li>
                      <li>
                        • <strong>Edit:</strong> Modify sections and parameters
                      </li>
                      <li>
                        • <strong>Use:</strong> Generate new exams from template
                      </li>
                      <li>
                        • <strong>Delete:</strong> Remove outdated templates
                      </li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Organization Tips
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>
                        • Use descriptive names (e.g., "Midterm - 2 Hours",
                        "Final - Comprehensive")
                      </li>
                      <li>• Color-code by exam type or difficulty level</li>
                      <li>• Include helpful descriptions for collaborators</li>
                      <li>• Regularly review and update template parameters</li>
                    </ul>
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
    }),
    []
  );

  // Get the current page tutorial based on pathname
  const currentPageTutorial = useMemo(() => {
    // Handle dynamic routes and specific patterns
    if (
      pathname.startsWith("/course/") &&
      pathname.includes("/question-bank")
    ) {
      return pageTutorials["/question-bank"];
    }
    if (pathname.startsWith("/course/") && pathname.includes("/exams")) {
      return pageTutorials["/exams"];
    }
    if (pathname.startsWith("/course/") && pathname.includes("/analytics")) {
      return pageTutorials["/analytics"];
    }
    if (pathname.startsWith("/course/") && pathname.includes("/activity")) {
      return pageTutorials["/activity"];
    }
    if (pathname.startsWith("/course/") && pathname.includes("/templates")) {
      return pageTutorials["/templates"];
    }

    // Handle main course page (e.g., /course/123)
    const coursePagePattern = /^\/course\/[^\/]+$/;
    if (coursePagePattern.test(pathname)) {
      return pageTutorials["/course-page"];
    }

    return pageTutorials[pathname] || null;
  }, [pathname, pageTutorials]);

  // Get a friendly page name for display
  const pageName = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/course-selector") return "Course Selector";
    if (pathname.includes("/question-bank")) return "Question Bank";
    if (pathname.includes("/exams")) return "Exam Builder";
    if (pathname.includes("/analytics")) return "Analytics";
    if (pathname.includes("/activity")) return "Activity";
    if (pathname.includes("/templates")) return "Templates";
    if (pathname === "/settings") return "Settings";
    if (pathname.startsWith("/course/")) return "Course Page";
    return "Current Page";
  }, [pathname]);

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const markPageVisited = useCallback(() => {
    setVisitedPages((prev) => {
      const newSet = new Set(prev);
      newSet.add(pathname);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "tutorial-visited-pages",
            JSON.stringify(Array.from(newSet))
          );
        } catch (error) {
          console.warn("Failed to save visited pages to localStorage:", error);
        }
      }

      return newSet;
    });
  }, [pathname]);

  const dismissHelpHint = useCallback(() => {
    setDismissedHints((prev) => {
      const newSet = new Set(prev);
      newSet.add(pathname);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "tutorial-dismissed-hints",
            JSON.stringify(Array.from(newSet))
          );
        } catch (error) {
          console.warn(
            "Failed to save dismissed hints to localStorage:",
            error
          );
        }
      }

      return newSet;
    });
  }, [pathname]);

  // Check if help hint should be shown (tutorial available, page not visited, hint not dismissed)
  const showHelpHint = useMemo(() => {
    // Don't show hints until hydration is complete to prevent hydration mismatches
    if (!isHydrated) return false;
    return Boolean(
      currentPageTutorial &&
        !visitedPages.has(pathname) &&
        !dismissedHints.has(pathname)
    );
  }, [currentPageTutorial, visitedPages, dismissedHints, pathname, isHydrated]);

  // Note: Keyboard shortcut handling moved to ModernHelpProvider to prevent duplicates

  // Mark current page as visited after a delay
  useEffect(() => {
    if (!currentPageTutorial) return;

    const timer = setTimeout(() => {
      markPageVisited();
    }, 3000); // Mark as visited after 3 seconds

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, currentPageTutorial, markPageVisited]);

  return {
    currentPageTutorial,
    showTutorial,
    startTutorial,
    closeTutorial,
    pageName,
    hasVisitedPage: visitedPages.has(pathname),
    markPageVisited,
    showHelpHint,
    dismissHelpHint,
  };
}
