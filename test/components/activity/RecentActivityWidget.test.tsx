/**
 * RecentActivityWidget Component Tests
 * 
 * Tests the RecentActivityWidget component rendering, API interactions, and user interactions
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RecentActivityWidget from '../../../app/components/activity/RecentActivityWidget';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the ActivityItem component
jest.mock('../../../app/components/activity/ActivityItem', () => {
  return function MockActivityItem({ activity, compact }: any) {
    return (
      <div data-testid={`activity-item-${activity.id}`} data-compact={compact}>
        <span>{activity.user.name}</span>
        <span>{activity.action}</span>
      </div>
    );
  };
});

// Mock fetch globally
global.fetch = jest.fn();

const mockActivities = [
  {
    id: 'activity-1',
    userId: 'user-123',
    courseId: 'course-123',
    action: 'EXAM_CREATED',
    resource: 'exam',
    resourceId: 'exam-456',
    details: '{"title":"Final Exam"}',
    createdAt: '2024-01-15T10:30:00Z',
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  {
    id: 'activity-2',
    userId: 'user-456',
    courseId: 'course-123',
    action: 'QUESTION_CREATED',
    resource: 'question',
    resourceId: 'question-789',
    details: '{"text":"What is 2+2?"}',
    createdAt: '2024-01-14T15:20:00Z',
    user: {
      id: 'user-456',
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  },
  {
    id: 'activity-3',
    userId: 'user-123',
    courseId: 'course-123',
    action: 'QUESTION_BANK_UPDATED',
    resource: 'question_bank',
    resourceId: 'bank-101',
    details: '{"name":"Math Questions"}',
    createdAt: '2024-01-13T09:15:00Z',
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
];

describe('RecentActivityWidget Component', () => {
  const mockPush = jest.fn();
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<RecentActivityWidget courseId="course-123" />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Successful Data Fetch', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockActivities
      } as Response);
    });

    it('should render activities when data is loaded', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('activity-item-activity-1')).toBeInTheDocument();
        expect(screen.getByTestId('activity-item-activity-2')).toBeInTheDocument();
        expect(screen.getByTestId('activity-item-activity-3')).toBeInTheDocument();
      });
    });

    it('should pass compact=true to ActivityItem components', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        const activityItems = screen.getAllByTestId(/activity-item-/);
        activityItems.forEach(item => {
          expect(item).toHaveAttribute('data-compact', 'true');
        });
      });
    });

    it('should fetch activities with limit=3', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/courses/course-123/activity?limit=3');
      });
    });

    it('should render View All button', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('should navigate to activity page when View All is clicked', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/course/course-123/activity');
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);
    });

    it('should show no activity message when no activities', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });

    it('should still show View All button when no activities', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('should show activity icon in empty state', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        const icon = screen.getByRole('img', { hidden: true }); // SVG icon
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      } as Response);
    });

    it('should show error message when fetch fails', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
      });
    });

    it('should show error icon in error state', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        const errorIcon = screen.getByRole('img', { hidden: true }); // SVG icon
        expect(errorIcon).toBeInTheDocument();
      });
    });

    it('should not show View All button in error state', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.queryByText('View All')).not.toBeInTheDocument();
      });
    });
  });

  describe('Network Error', () => {
    beforeEach(() => {
      mockFetch.mockRejectedValue(new Error('Network error'));
    });

    it('should show error message when network request fails', async () => {
      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('should use courseId in API call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);

      render(<RecentActivityWidget courseId="test-course-456" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/courses/test-course-456/activity?limit=3');
      });
    });

    it('should navigate to correct course activity page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);

      render(<RecentActivityWidget courseId="test-course-456" />);

      await waitFor(() => {
        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/course/test-course-456/activity');
    });
  });

  describe('Widget Layout', () => {
    it('should have correct styling classes', () => {
      render(<RecentActivityWidget courseId="course-123" />);

      const widget = screen.getByText('Recent Activity').closest('div');
      expect(widget).toHaveClass('bg-white', 'rounded-lg', 'border', 'border-gray-200', 'p-6', 'h-48');
    });

    it('should have scrollable activity list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockActivities
      } as Response);

      render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        const activityList = screen.getByTestId('activity-item-activity-1').closest('div');
        expect(activityList?.parentElement).toHaveClass('max-h-32', 'overflow-y-auto');
      });
    });
  });

  describe('useEffect Dependency', () => {
    it('should refetch when courseId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);

      const { rerender } = render(<RecentActivityWidget courseId="course-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/courses/course-123/activity?limit=3');
      });

      mockFetch.mockClear();

      rerender(<RecentActivityWidget courseId="course-456" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/courses/course-456/activity?limit=3');
      });
    });
  });
});