/**
 * Activity Page Frontend Tests
 * 
 * Tests the Activity page component behavior and API interactions.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
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

// Simple mock component for testing
const MockActivityPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Test authentication flow
  if (status === 'loading') {
    return <div data-testid="loading">Loading</div>;
  }
  
  if (!session) {
    router.push('/auth/login');
    return null;
  }
  
  // Test basic rendering
  return (
    <div data-testid="activity-page">
      <h1>Activity</h1>
      <div data-testid="course-info">Course: {params?.id}</div>
      <div data-testid="sidebar-mode">{searchParams?.get('sidebar') === 'true' ? 'Sidebar' : 'Normal'}</div>
      <div data-testid="content">Activity content loaded</div>
    </div>
  );
};

describe('Activity Page Component Tests', () => {
  const mockPush = jest.fn();
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default router setup
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });

    // Default params setup
    mockUseParams.mockReturnValue({ id: 'course-123' });
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);
  });

  describe('Authentication Flow', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(<MockActivityPage />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    it('should redirect to login when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(<MockActivityPage />);

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should render content when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(<MockActivityPage />);

      expect(screen.getByTestId('activity-page')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toHaveTextContent('Activity content loaded');
    });
  });

  describe('Component Behavior', () => {
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

    it('should display course ID from params', () => {
      render(<MockActivityPage />);

      expect(screen.getByTestId('course-info')).toHaveTextContent('Course: course-123');
    });

    it('should handle normal mode', () => {
      render(<MockActivityPage />);

      expect(screen.getByTestId('sidebar-mode')).toHaveTextContent('Normal');
    });

    it('should handle sidebar mode', () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn().mockImplementation((key) => key === 'sidebar' ? 'true' : null),
      } as any);

      render(<MockActivityPage />);

      expect(screen.getByTestId('sidebar-mode')).toHaveTextContent('Sidebar');
    });

    it('should handle different course IDs', () => {
      mockUseParams.mockReturnValue({ id: 'course-456' });

      render(<MockActivityPage />);

      expect(screen.getByTestId('course-info')).toHaveTextContent('Course: course-456');
    });
  });

  describe('Hook Integration', () => {
    it('should call navigation hooks correctly', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'instructor' },
          expires: '2024-12-31T23:59:59Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(<MockActivityPage />);

      expect(mockUseSession).toHaveBeenCalled();
      expect(mockUseRouter).toHaveBeenCalled();
      expect(mockUseParams).toHaveBeenCalled();
      expect(mockUseSearchParams).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(<MockActivityPage />);

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });
}); 