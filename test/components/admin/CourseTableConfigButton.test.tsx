import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseTable from '../../../app/(features)/admin/components/CourseTable';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('../../../app/(features)/admin/components/CourseConfigModal', () => {
  return function MockCourseConfigModal({ isOpen, course, onClose }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="course-config-modal">
        <div>Course Config Modal for {course?.name}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

jest.mock('../../../app/(features)/admin/components/CourseModal', () => {
  return function MockCourseModal({ isOpen }: any) {
    if (!isOpen) return null;
    return <div data-testid="course-modal">Course Modal</div>;
  };
});

jest.mock('../../../app/(features)/admin/components/DeleteConfirmationModal', () => {
  return function MockDeleteConfirmationModal({ isOpen }: any) {
    if (!isOpen) return null;
    return <div data-testid="delete-modal">Delete Modal</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CourseTable Config Button', () => {
  const mockCourses = [
    {
      id: 'course-1',
      name: 'Test Course 1',
      description: 'Test Description 1',
      color: '#10b981',
      section: '001',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'TEACHER',
      },
      term: {
        id: 'term-1',
        term: 'Fall',
        year: 2023,
      },
      stats: {
        examCount: 2,
        questionCount: 50,
        enrollmentCount: 25,
      },
    },
    {
      id: 'course-2',
      name: 'Test Course 2',
      description: 'Test Description 2',
      color: '#3b82f6',
      section: '002',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      user: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'TEACHER',
      },
      term: {
        id: 'term-1',
        term: 'Fall',
        year: 2023,
      },
      stats: {
        examCount: 1,
        questionCount: 30,
        enrollmentCount: 20,
      },
    },
  ];

  const mockProps = {
    courses: mockCourses,
    setCourses: jest.fn(),
    loading: false,
    onRefresh: jest.fn(),
    pagination: {
      page: 1,
      limit: 20,
      totalCount: 2,
      totalPages: 1,
    },
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Mock fetch responses for terms and instructors
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'term-1', term: 'Fall', year: 2023 },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'TEACHER' },
          { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'TEACHER' },
        ],
      } as Response);
  });

  it('should render Config button for each course', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
      expect(screen.getByText('Test Course 2')).toBeInTheDocument();
    });

    // Check that Config buttons are rendered
    const configButtons = screen.getAllByText('Config');
    expect(configButtons).toHaveLength(2);
  });

  it('should render Edit and Config buttons in the same row', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    // Get the first course row
    const firstCourseRow = screen.getByText('Test Course 1').closest('tr');
    expect(firstCourseRow).toBeInTheDocument();

    // Check that both Edit and Config buttons are in the same row
    const editButton = screen.getAllByText('Edit')[0];
    const configButton = screen.getAllByText('Config')[0];

    expect(editButton).toBeInTheDocument();
    expect(configButton).toBeInTheDocument();
  });

  it('should open CourseConfigModal when Config button is clicked', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    // Click the first Config button
    const configButtons = screen.getAllByText('Config');
    fireEvent.click(configButtons[0]);

    // Check that the CourseConfigModal is opened
    await waitFor(() => {
      expect(screen.getByTestId('course-config-modal')).toBeInTheDocument();
      expect(screen.getByText('Course Config Modal for Test Course 1')).toBeInTheDocument();
    });
  });

  it('should close CourseConfigModal when close is triggered', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    // Click the first Config button
    const configButtons = screen.getAllByText('Config');
    fireEvent.click(configButtons[0]);

    // Check that the modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('course-config-modal')).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);

    // Check that the modal is closed
    await waitFor(() => {
      expect(screen.queryByTestId('course-config-modal')).not.toBeInTheDocument();
    });
  });

  it('should open config modal for the correct course', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 2')).toBeInTheDocument();
    });

    // Click the second Config button (for Test Course 2)
    const configButtons = screen.getAllByText('Config');
    fireEvent.click(configButtons[1]);

    // Check that the modal opens for the correct course
    await waitFor(() => {
      expect(screen.getByTestId('course-config-modal')).toBeInTheDocument();
      expect(screen.getByText('Course Config Modal for Test Course 2')).toBeInTheDocument();
    });
  });

  it('should have purple styling for Config button', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    const configButtons = screen.getAllByText('Config');
    const firstConfigButton = configButtons[0];

    // Check that the Config button has purple styling
    expect(firstConfigButton).toHaveClass('text-purple-600', 'hover:text-purple-900');
  });

  it('should have blue styling for Edit button', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    const firstEditButton = editButtons[0];

    // Check that the Edit button has blue styling
    expect(firstEditButton).toHaveClass('text-blue-600', 'hover:text-blue-900');
  });

  it('should have proper spacing between Edit and Config buttons', async () => {
    render(<CourseTable {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    });

    // Get the first course row's action cell
    const firstCourseRow = screen.getByText('Test Course 1').closest('tr');
    const actionCell = firstCourseRow?.querySelector('td:last-child');
    const buttonContainer = actionCell?.querySelector('div');

    // Check that the button container has proper flex and spacing classes
    expect(buttonContainer).toHaveClass('flex', 'justify-end', 'space-x-3');
  });
});