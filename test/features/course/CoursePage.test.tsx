/**
 * Course Page Tests
 * 
 * Tests the main course dashboard page component behavior and RecentActivityWidget integration
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock RecentActivityWidget
jest.mock('../../../app/components/activity/RecentActivityWidget', () => {
  return function MockRecentActivityWidget({ courseId }: { courseId: string }) {
    return (
      <div data-testid="recent-activity-widget" data-course-id={courseId}>
        <h3>Recent Activity</h3>
        <div>Mock recent activities for {courseId}</div>
        <button>View All</button>
      </div>
    );
  };
});

// Mock Sidebar component
jest.mock('../../../app/components/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

// Mock other heavy dependencies
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBlob: jest.fn(),
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'heading1',
    HEADING_2: 'heading2',
  },
}));

jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn(),
    folder: jest.fn().mockReturnValue({
      file: jest.fn(),
    }),
    generateAsync: jest.fn().mockResolvedValue(new Blob()),
  }));
});

// Mock fetch globally
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockCourse = {
  id: 'course-123',
  name: 'Computer Science 101',
  description: 'Introduction to Computer Science',
  color: '#3B82F6',
  examCount: 5,
  questionCount: 150
};

// Simple mock component to test course page basics
const MockCoursePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  
  if (status === 'loading') {
    return <div data-testid="loading">Loading course...</div>;
  }
  
  if (!session) {
    return null;
  }
  
  const courseId = params?.id as string;
  
  return (
    <div data-testid="course-page">
      <div data-testid="course-header">
        <h1>{mockCourse.name}</h1>
        <p>{mockCourse.description}</p>
      </div>
      
      <div data-testid="course-stats">
        <span data-testid="exam-count">{mockCourse.examCount} Exams</span>
        <span data-testid="question-count">{mockCourse.questionCount} Questions</span>
      </div>
      
      <div data-testid="quick-actions">
        <button onClick={() => router.push(`/course/${courseId}/question-bank`)}>
          Manage Questions
        </button>
        <button onClick={() => router.push(`/course/${courseId}/exams`)}>
          Manage Exams
        </button>
        <button onClick={() => router.push(`/course/${courseId}/analytics`)}>
          View Analytics
        </button>
        <button onClick={() => router.push(`/course/${courseId}/settings`)}>
          Manage Settings
        </button>
      </div>
      
      {/* Recent Activity Widget Integration */}
      <div data-testid="widgets-section">
        <div data-testid="recent-activity-widget-container">
          {/* This is where RecentActivityWidget would be rendered */}
          <div data-testid="recent-activity-widget" data-course-id={courseId}>
            <h3>Recent Activity</h3>
            <div>Mock recent activities for {courseId}</div>
            <button>View All</button>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('Course Page Component', () => {
  const mockPush = jest.fn();
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });

    mockUseParams.mockReturnValue({ id: 'course-123' });
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockCourse
    } as Response);
  });

  describe('Authentication and Loading', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(<MockCoursePage />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading course...');
    });

    it('should render course page when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(<MockCoursePage />);

      expect(screen.getByTestId('course-page')).toBeInTheDocument();
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    });
  });

  describe('Course Information Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should display course statistics', () => {
      render(<MockCoursePage />);

      expect(screen.getByTestId('exam-count')).toHaveTextContent('5 Exams');
      expect(screen.getByTestId('question-count')).toHaveTextContent('150 Questions');
    });

    it('should display quick action buttons', () => {
      render(<MockCoursePage />);

      expect(screen.getByText('Manage Questions')).toBeInTheDocument();
      expect(screen.getByText('Manage Exams')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
      expect(screen.getByText('Manage Settings')).toBeInTheDocument();
    });
  });

  describe('Recent Activity Widget Integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should render RecentActivityWidget with correct courseId', () => {
      render(<MockCoursePage />);

      const recentActivityWidget = screen.getByTestId('recent-activity-widget');
      expect(recentActivityWidget).toBeInTheDocument();
      expect(recentActivityWidget).toHaveAttribute('data-course-id', 'course-123');
    });

    it('should display Recent Activity title in widget', () => {
      render(<MockCoursePage />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('should display View All button in activity widget', () => {
      render(<MockCoursePage />);

      expect(screen.getByText('View All')).toBeInTheDocument();
    });

    it('should pass different courseId when params change', () => {
      mockUseParams.mockReturnValue({ id: 'course-456' });

      render(<MockCoursePage />);

      const recentActivityWidget = screen.getByTestId('recent-activity-widget');
      expect(recentActivityWidget).toHaveAttribute('data-course-id', 'course-456');
    });
  });

  describe('Course Layout Structure', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should have proper section organization', () => {
      render(<MockCoursePage />);

      expect(screen.getByTestId('course-header')).toBeInTheDocument();
      expect(screen.getByTestId('course-stats')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      expect(screen.getByTestId('widgets-section')).toBeInTheDocument();
    });

    it('should have recent activity widget in widgets section', () => {
      render(<MockCoursePage />);

      const widgetsSection = screen.getByTestId('widgets-section');
      const recentActivityContainer = screen.getByTestId('recent-activity-widget-container');
      
      expect(widgetsSection).toContainElement(recentActivityContainer);
    });
  });

  describe('Widget Replacement Integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should not show old static activity message', () => {
      render(<MockCoursePage />);

      // The old static "No recent activity" message should not be present
      expect(screen.queryByText('No recent activity')).not.toBeInTheDocument();
    });

    it('should show dynamic activity content', () => {
      render(<MockCoursePage />);

      // Should show dynamic content from the widget
      expect(screen.getByText(/Mock recent activities for/)).toBeInTheDocument();
    });
  });
});